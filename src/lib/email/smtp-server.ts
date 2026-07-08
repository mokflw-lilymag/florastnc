import nodemailer from 'nodemailer';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SystemSettings } from '@/hooks/use-settings';
import { mergeTenantEmailSettings } from '@/lib/email/tenant-email-settings';

export type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  senderName: string;
  senderEmail?: string;
};

export function resolveSmtpFromSettings(
  settings: Partial<SystemSettings>,
  fallbackName: string,
): SmtpConfig | null {
  if (settings.smtpEnabled && settings.smtpUser && settings.smtpPass) {
    const port = parseInt(String(settings.smtpPort || '587'), 10) || 587;
    return {
      host: settings.smtpHost || 'smtp.gmail.com',
      port,
      secure: port === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPass,
      },
      senderName: settings.smtpSenderName || settings.siteName || fallbackName,
      senderEmail: (settings.storeEmail || settings.contactEmail || settings.smtpUser)?.includes('@') 
        ? (settings.storeEmail || settings.contactEmail || settings.smtpUser) 
        : 'admin@floxync.com',
    };
  }
  return null;
}

export function resolveEnvSmtpConfig(): SmtpConfig | null {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;
  const port = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    senderName: process.env.SMTP_SENDER_NAME || 'FloXync',
  };
}

export async function loadHqGeneralSettings(
  db: SupabaseClient,
): Promise<SystemSettings> {
  const { data } = await db
    .from('system_settings')
    .select('data')
    .eq('id', 'hq')
    .maybeSingle();

  const partial = (data?.data && typeof data.data === 'object' ? data.data : {}) as Partial<SystemSettings>;
  return mergeTenantEmailSettings(partial) as SystemSettings;
}

export async function resolveSmtpForHq(
  db: SupabaseClient,
): Promise<SmtpConfig | null> {
  const settings = await loadHqGeneralSettings(db);
  return resolveSmtpFromSettings(settings, settings.siteName || 'FloXync') ?? resolveEnvSmtpConfig();
}

export async function loadTenantGeneralSettings(
  db: SupabaseClient,
  tenantId: string,
): Promise<SystemSettings> {
  const { data } = await db
    .from('system_settings')
    .select('data')
    .eq('id', `settings_${tenantId}`)
    .maybeSingle();

  const partial = (data?.data && typeof data.data === 'object' ? data.data : {}) as Partial<SystemSettings>;
  return mergeTenantEmailSettings(partial) as SystemSettings;
}

export async function resolveSmtpForTenant(
  db: SupabaseClient,
  tenantId: string,
): Promise<SmtpConfig | null> {
  const settings = await loadTenantGeneralSettings(db, tenantId);
  return resolveSmtpFromSettings(settings, settings.siteName || 'FloXync') ?? resolveSmtpForHq(db);
}

export async function sendMailViaSmtp(
  config: SmtpConfig,
  params: { to: string; subject: string; html: string },
): Promise<{ messageId: string } | { simulated: true }> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  const info = await transporter.sendMail({
    from: `"${config.senderName}" <${config.senderEmail || config.auth.user}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  return { messageId: info.messageId };
}
