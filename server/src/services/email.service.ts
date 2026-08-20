import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../lib/logger';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    });
  }
  return transporter;
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    logger.warn(`SMTP not configured — email to ${to} not sent (subject: ${subject})`);
    return false;
  }
  try {
    await t.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    return true;
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, { error: String(error) });
    return false;
  }
}