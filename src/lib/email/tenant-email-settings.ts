import type { SystemSettings } from '@/hooks/use-settings';
import { getDefaultEmailTemplates } from '@/lib/messenger/localized-templates';

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
      partial.emailTemplateProductionComplete || getDefaultEmailTemplates('ko').productionComplete,
    emailTemplateDeliveryComplete:
      partial.emailTemplateDeliveryComplete || getDefaultEmailTemplates('ko').deliveryComplete,
    emailTemplateAnniversaryD7:
      partial.emailTemplateAnniversaryD7 || getDefaultEmailTemplates('ko').marketingDaysBefore7,
  };
}
