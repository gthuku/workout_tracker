import { v4 as uuidv4 } from 'uuid';
import webpush from 'web-push';
import { db } from '../database.js';
import logger from '../utils/logger.js';
import type { SavePushSubscriptionInput, ScheduleRestTimerNotificationInput } from '../schemas/index.js';

interface DbPushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  expiration_time: number | null;
}

interface DbRestTimerNotification {
  id: string;
  user_id: string;
  due_at: number;
  title: string;
  body: string;
}

const PROCESS_INTERVAL_MS = 3000;

let workerInterval: ReturnType<typeof setInterval> | null = null;
let isConfigured = false;
let vapidPublicKey: string | null = null;
let vapidPrivateKey: string | null = null;

function configureWebPush(): boolean {
  const envPublicKey = process.env.WEB_PUSH_PUBLIC_KEY || null;
  const envPrivateKey = process.env.WEB_PUSH_PRIVATE_KEY || null;
  const subject = process.env.WEB_PUSH_SUBJECT || 'mailto:support@wrkoutlog.fit';

  if (envPublicKey && envPrivateKey) {
    vapidPublicKey = envPublicKey;
    vapidPrivateKey = envPrivateKey;
  } else {
    const generated = webpush.generateVAPIDKeys();
    vapidPublicKey = generated.publicKey;
    vapidPrivateKey = generated.privateKey;
    logger.warn({
      publicKey: vapidPublicKey,
    }, 'WEB_PUSH_PUBLIC_KEY/WEB_PUSH_PRIVATE_KEY not set. Generated ephemeral VAPID keys for this process');
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    logger.warn('Web push disabled: failed to initialize VAPID keys');
    isConfigured = false;
    return false;
  }

  try {
    webpush.setVapidDetails(subject, vapidPublicKey, vapidPrivateKey);
    isConfigured = true;
    return true;
  } catch (error) {
    logger.error({ error }, 'Failed to configure web push');
    isConfigured = false;
    return false;
  }
}

function toPushSubscription(row: DbPushSubscription): webpush.PushSubscription {
  return {
    endpoint: row.endpoint,
    expirationTime: row.expiration_time,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  };
}

async function processDueNotifications(): Promise<void> {
  if (!isConfigured) return;

  const now = Date.now();
  const dueRows = await db.query<DbRestTimerNotification>(
    `SELECT id, user_id, due_at, title, body
     FROM rest_timer_notifications
     WHERE status = 'pending' AND due_at <= $1
     ORDER BY due_at ASC
     LIMIT 50`,
    [now]
  );

  for (const notification of dueRows) {
    const subscriptions = await db.query<DbPushSubscription>(
      `SELECT id, user_id, endpoint, p256dh, auth, expiration_time
       FROM push_subscriptions
       WHERE user_id = $1`,
      [notification.user_id]
    );

    if (subscriptions.length === 0) {
      await db.execute(
        `UPDATE rest_timer_notifications
         SET status = 'failed', error = $1, sent_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        ['No active push subscriptions', notification.id]
      );
      continue;
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      tag: `rest-timer-${notification.id}`,
      data: {
        timerId: notification.id,
        dueAt: notification.due_at,
      },
    });

    let sentCount = 0;
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(toPushSubscription(subscription), payload, { TTL: 300 });
        sentCount += 1;
      } catch (error) {
        const statusCode = typeof error === 'object' && error !== null && 'statusCode' in error
          ? Number((error as { statusCode?: number }).statusCode)
          : 0;

        if (statusCode === 404 || statusCode === 410) {
          await db.execute('DELETE FROM push_subscriptions WHERE endpoint = $1', [subscription.endpoint]);
        }

        logger.warn({
          notificationId: notification.id,
          endpoint: subscription.endpoint,
          statusCode,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to send push notification');
      }
    }

    if (sentCount > 0) {
      await db.execute(
        `UPDATE rest_timer_notifications
         SET status = 'sent', sent_at = CURRENT_TIMESTAMP, error = NULL
         WHERE id = $1`,
        [notification.id]
      );
    } else {
      await db.execute(
        `UPDATE rest_timer_notifications
         SET status = 'failed', sent_at = CURRENT_TIMESTAMP, error = $1
         WHERE id = $2`,
        ['Failed to send to all subscriptions', notification.id]
      );
    }
  }
}

export const pushService = {
  getPublicConfig() {
    if (!vapidPublicKey) {
      configureWebPush();
    }

    return {
      enabled: isConfigured,
      publicKey: isConfigured ? vapidPublicKey : null,
    };
  },

  async saveSubscription(userId: string, input: SavePushSubscriptionInput) {
    const { subscription, userAgent } = input;
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM push_subscriptions WHERE endpoint = $1',
      [subscription.endpoint]
    );

    if (existing) {
      await db.execute(
        `UPDATE push_subscriptions
         SET user_id = $1, p256dh = $2, auth = $3, expiration_time = $4, user_agent = $5, updated_at = CURRENT_TIMESTAMP
         WHERE endpoint = $6`,
        [
          userId,
          subscription.keys.p256dh,
          subscription.keys.auth,
          subscription.expirationTime ?? null,
          userAgent ?? null,
          subscription.endpoint,
        ]
      );
      return { success: true };
    }

    await db.execute(
      `INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth, expiration_time, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        userId,
        subscription.endpoint,
        subscription.keys.p256dh,
        subscription.keys.auth,
        subscription.expirationTime ?? null,
        userAgent ?? null,
      ]
    );

    return { success: true };
  },

  async removeSubscription(userId: string, endpoint: string) {
    await db.execute(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
      [userId, endpoint]
    );
    return { success: true };
  },

  async scheduleRestTimerNotification(userId: string, input: ScheduleRestTimerNotificationInput) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM rest_timer_notifications WHERE id = $1 AND user_id = $2',
      [input.timerId, userId]
    );

    if (existing) {
      await db.execute(
        `UPDATE rest_timer_notifications
         SET due_at = $1, title = $2, body = $3, status = 'pending', error = NULL, sent_at = NULL
         WHERE id = $4 AND user_id = $5`,
        [input.dueAt, input.title, input.body, input.timerId, userId]
      );
    } else {
      await db.execute(
        `INSERT INTO rest_timer_notifications (id, user_id, due_at, title, body, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')`,
        [input.timerId, userId, input.dueAt, input.title, input.body]
      );
    }

    return { success: true, timerId: input.timerId };
  },

  async cancelRestTimerNotification(userId: string, timerId: string) {
    await db.execute(
      `UPDATE rest_timer_notifications
       SET status = 'cancelled', error = NULL
       WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [timerId, userId]
    );
    return { success: true };
  },

  async startWorker() {
    configureWebPush();
    if (!isConfigured || workerInterval) return;

    workerInterval = setInterval(() => {
      processDueNotifications().catch((error) => {
        logger.error({ error }, 'Failed to process push notifications');
      });
    }, PROCESS_INTERVAL_MS);

    await processDueNotifications().catch((error) => {
      logger.error({ error }, 'Failed initial push notification processing');
    });

    logger.info({ intervalMs: PROCESS_INTERVAL_MS }, 'Push notification worker started');
  },

  async stopWorker() {
    if (workerInterval) {
      clearInterval(workerInterval);
      workerInterval = null;
      logger.info('Push notification worker stopped');
    }
  },
};
