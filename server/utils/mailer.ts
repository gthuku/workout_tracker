import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import logger from './logger.js';

const execFileAsync = promisify(execFile);

type SendEmailInput = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
};

function getSesRegion(): string | null {
  return (
    process.env.AUTH_SES_REGION ||
    process.env.AWS_REGION ||
    process.env.AWS_DEFAULT_REGION ||
    null
  );
}

async function sendEmailViaSesCli(input: SendEmailInput): Promise<void> {
  const region = getSesRegion();
  if (!region) {
    throw new Error('SES region not configured (set AUTH_SES_REGION or AWS_REGION)');
  }

  const req = {
    Source: input.from,
    Destination: { ToAddresses: [input.to] },
    Message: {
      Subject: { Data: input.subject, Charset: 'UTF-8' },
      Body: {
        Text: { Data: input.text, Charset: 'UTF-8' },
        ...(input.html ? { Html: { Data: input.html, Charset: 'UTF-8' } } : {}),
      },
    },
  };

  const tmpFile = path.join(os.tmpdir(), `ses-send-email-${crypto.randomUUID()}.json`);
  await fs.writeFile(tmpFile, JSON.stringify(req), 'utf8');

  try {
    await execFileAsync(
      'aws',
      ['ses', 'send-email', '--region', region, '--cli-input-json', `file://${tmpFile}`],
      { timeout: 15_000 }
    );
  } finally {
    await fs.unlink(tmpFile).catch(() => {});
  }
}

export async function sendPasswordResetEmail(opts: {
  to: string;
  username: string;
  resetToken: string;
  expiresInHours: number;
}): Promise<void> {
  const from = process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM;
  if (!from) {
    throw new Error('Missing AUTH_EMAIL_FROM (or EMAIL_FROM) for password reset emails');
  }

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl.replace(/\/$/, '')}/?resetToken=${encodeURIComponent(opts.resetToken)}`;

  const subject = 'Reset your Workout Fit password';
  const text =
    `A password reset was requested for ${opts.username}.\n\n` +
    `Reset link (expires in ${opts.expiresInHours} hour(s)):\n` +
    `${resetUrl}\n\n` +
    `If you did not request this, you can ignore this email.`;

  const html =
    `<p>A password reset was requested for <strong>${opts.username}</strong>.</p>` +
    `<p><a href="${resetUrl}">Click here to reset your password</a> (expires in ${opts.expiresInHours} hour(s)).</p>` +
    `<p>If you did not request this, you can ignore this email.</p>`;

  logger.info({ to: opts.to }, 'Sending password reset email');
  await sendEmailViaSesCli({ to: opts.to, from, subject, text, html });
}
