import nodemailer from 'nodemailer';

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_URL ?? process.env.SMTP_HOST);
}

function buildTransport() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL);
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === '1',
    auth:
      process.env.SMTP_USER || process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });
}

export async function sendAlertEmail(to: string, subject: string, text: string): Promise<void> {
  if (!isMailConfigured()) {
    throw new Error('Email channel unavailable: SMTP not configured');
  }
  const from = process.env.SMTP_FROM ?? 'pulse-status@localhost';
  const transporter = buildTransport();
  await transporter.sendMail({ from, to, subject, text });
}
