import { createContext, useContext } from 'react'
import { pick, render, type Pack } from './pack'
import { useDemo } from './store'
import type { Severity, Text } from './types'

const UI = {
  overview: { en: 'Executive overview', ar: 'النظرة التنفيذية' },
  report: { en: "Today's report", ar: 'تقرير اليوم' },
  experts: { en: 'Digital experts', ar: 'الخبراء الرقميون' },
  observed: { en: 'Observed', ar: 'وقت الرصد' },
  illustrative: { en: 'Illustrative data for demonstration', ar: 'بيانات توضيحية لأغراض العرض' },
  poweredBy: { en: 'Powered by Cloudera', ar: 'Powered by Cloudera' },
  definition: { en: 'Definition', ar: 'التعريف' },
  normal: { en: 'Normal', ar: 'طبيعي' },
  watch: { en: 'Watch', ar: 'مراقبة' },
  critical: { en: 'Critical', ar: 'حرج' },
  priorityIncidents: { en: 'Priority incidents', ar: 'الحوادث ذات الأولوية' },
  hero: { en: 'Now', ar: 'الآن' },
  chronic: { en: 'Recurring', ar: 'متكرر' },
  since: { en: 'since', ar: 'منذ' },
  allRegions: { en: 'All regions', ar: 'كل المناطق' },
  allTypes: { en: 'All asset types', ar: 'كل أنواع الأصول' },
  allStatus: { en: 'All', ar: 'الكل' },
  search: { en: 'Search sites', ar: 'ابحث عن موقع' },
  site: { en: 'Site', ar: 'الموقع' },
  region: { en: 'Region', ar: 'المنطقة' },
  type: { en: 'Asset type', ar: 'نوع الأصل' },
  status: { en: 'Status', ar: 'الحالة' },
  note: { en: 'Why', ar: 'السبب' },
  sitesShown: { en: 'sites shown', ar: 'موقعاً معروضاً' },
  needAttention: { en: 'need attention', ar: 'تتطلب الانتباه' },
  legendSites: { en: 'Site status', ar: 'حالة الموقع' },
  legendRegions: { en: 'Region shading: worst site status. Bubble: sites needing attention.', ar: 'تظليل المنطقة: أسوأ حالة موقع. الفقاعة: المواقع التي تتطلب الانتباه.' },
  back: { en: 'All regions', ar: 'كل المناطق' },
  askPlaceholder: { en: 'Ask a question…', ar: 'اطرح سؤالاً…' },
  send: { en: 'Send', ar: 'إرسال' },
  tryAsking: { en: 'Try asking', ar: 'جرّب أن تسأل' },
  tellMeMore: { en: 'Tell me more', ar: 'أخبرني المزيد' },
  fallback: { en: "That isn't in today's data. I can tell you about:", ar: 'هذا ليس ضمن بيانات اليوم. يمكنني إخبارك عن:' },
  grounded: { en: 'Grounded in the demo data · illustrative', ar: 'مستند إلى بيانات العرض · توضيحي' },
  presenter: { en: 'Presenter', ar: 'المقدّم' },
  start: { en: 'Start', ar: 'ابدأ' },
  pause: { en: 'Pause', ar: 'إيقاف مؤقت' },
  next: { en: 'Next', ar: 'التالي' },
  previous: { en: 'Previous', ar: 'السابق' },
  reset: { en: 'Reset demo', ar: 'إعادة ضبط العرض' },
  close: { en: 'Close', ar: 'إغلاق' },
  assumptions: { en: 'Assumptions', ar: 'الافتراضات' },
  assumptionsHint: { en: 'Assumed for this demo. Do not present these as customer facts.', ar: 'مفترضة لهذا العرض. لا تقدّمها كحقائق عن العميل.' },
  noAssumptions: { en: 'No assumed values.', ar: 'لا توجد قيم مفترضة.' },
  textSize: { en: 'Text size', ar: 'حجم النص' },
  reduceMotion: { en: 'Reduce motion', ar: 'تقليل الحركة' },
  fullscreen: { en: 'Full screen', ar: 'ملء الشاشة' },
  language: { en: 'Language', ar: 'اللغة' },
  open: { en: 'Open', ar: 'افتح' },
  steps: { en: 'steps', ar: 'خطوات' },
  mapPending: { en: 'The map appears once the wizard has the organisation and sites.', ar: 'تظهر الخريطة بعد إدخال المناطق والمواقع في المعالج.' },
} satisfies Record<string, Text>

export type UiKey = keyof typeof UI

export const PackContext = createContext<Pack | null>(null)

export function usePack(): Pack {
  const p = useContext(PackContext)
  if (!p) throw new Error('usePack must be used inside <DemoApp>')
  return p
}

export function useT() {
  const pack = usePack()
  const locale = useDemo((s) => s.locale)
  return {
    pack,
    locale,
    rtl: locale === 'ar',
    t: (k: UiKey) => pick(UI[k], locale),
    p: (text: Text | undefined) => pick(text, locale),
    r: (text: Text | undefined) => render(pack, pick(text, locale), locale),
    sev: (s: Severity) => pick(UI[s], locale),
  }
}
