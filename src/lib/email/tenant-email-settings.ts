import type { SystemSettings } from '@/hooks/use-settings';
import {
  DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7,
  DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE,
  DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE,
} from '@/lib/email/default-templates';

/** 서버(Trigger/API)에서 테넌트 이메일 설정 병합 시 사용 — client hook과 분리 */
export function mergeTenantEmailSettings(raw: unknown): Pick<
  SystemSettings,
  | 'siteName'
  | 'smtpEnabled'
  | 'smtpHost'
  | 'smtpPort'
  | 'smtpUser'
  | 'smtpPass'
  | 'smtpSenderName'
  | 'autoEmailProductionComplete'
  | 'autoEmailDeliveryComplete'
  | 'autoEmailAnniversaryD7'
  | 'emailTemplateProductionComplete'
  | 'emailTemplateDeliveryComplete'
  | 'emailTemplateAnniversaryD7'
> {
  const partial = (raw && typeof raw === 'object' ? raw : {}) as Partial<SystemSettings>;
  return {
    siteName: partial.siteName || 'FloXync',
    smtpEnabled: partial.smtpEnabled ?? false,
    smtpHost: partial.smtpHost || 'smtp.gmail.com',
    smtpPort: partial.smtpPort || '587',
    smtpUser: partial.smtpUser || '',
    smtpPass: partial.smtpPass || '',
    smtpSenderName: partial.smtpSenderName || partial.siteName || '',
    autoEmailProductionComplete: partial.autoEmailProductionComplete ?? true,
    autoEmailDeliveryComplete: partial.autoEmailDeliveryComplete ?? true,
    autoEmailAnniversaryD7: partial.autoEmailAnniversaryD7 ?? false,
    emailTemplateProductionComplete:
      partial.emailTemplateProductionComplete || DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE,
    emailTemplateDeliveryComplete:
      partial.emailTemplateDeliveryComplete || DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE,
    emailTemplateAnniversaryD7:
      partial.emailTemplateAnniversaryD7 || DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7,
  };
}
