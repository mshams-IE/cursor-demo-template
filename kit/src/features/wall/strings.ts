import type { Text } from '../../types'

export const W = {
  commandView: { en: 'Command view', ar: 'شاشة القيادة' },
  exit: { en: 'Exit', ar: 'خروج' },
  play: { en: 'Play', ar: 'تشغيل' },
  pause: { en: 'Pause', ar: 'إيقاف مؤقت' },
  tour: { en: 'Auto tour', ar: 'جولة تلقائية' },
  alerts: { en: 'Alerts', ar: 'التنبيهات' },
  noAlerts: { en: 'No active alerts.', ar: 'لا توجد تنبيهات نشطة.' },
  noIncidents: { en: 'No active incidents.', ar: 'لا توجد حوادث نشطة.' },
  active: { en: 'Active', ar: 'نشط' },
  restoreIn: { en: 'Estimated restoration', ar: 'تقدير الاستعادة' },
  started: { en: 'Started', ar: 'بدأ' },
} satisfies Record<string, Text>
