self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Workout Tracker',
    body: 'Your timer has finished.',
    tag: 'workout-rest-timer',
    data: {},
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = {
        ...payload,
        ...parsed,
      };
    } catch {
      // Ignore invalid payload and use defaults.
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      data: payload.data,
      requireInteraction: false,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const routeFromPayload = event.notification?.data && typeof event.notification.data.url === 'string'
    ? event.notification.data.url
    : '/workout';
  const targetUrl = new URL(routeFromPayload, self.location.origin).toString();

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const sameOriginClient = windowClients.find((client) => {
      try {
        return new URL(client.url).origin === self.location.origin;
      } catch {
        return false;
      }
    });

    const targetClient = sameOriginClient || windowClients[0];
    if (targetClient) {
      await targetClient.focus();
      if (typeof targetClient.navigate === 'function') {
        await targetClient.navigate(targetUrl);
      } else {
        targetClient.postMessage({ type: 'OPEN_WORKOUT', url: targetUrl });
      }
      return;
    }

    if (clients.openWindow) {
      await clients.openWindow(targetUrl);
    }
  })());
});
