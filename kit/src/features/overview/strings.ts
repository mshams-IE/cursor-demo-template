import type { Text } from '../../types'

export const OVERVIEW = {
  vsHourAgo: { en: 'vs 1 h ago', ar: 'عن الساعة الماضية' },
  priorityInsights: { en: 'Priority insights', ar: 'رؤى ذات أولوية' },
  watchList: { en: 'Watch list', ar: 'قائمة المتابعة' },
  allClear: {
    en: 'Everything is normal at this time.',
    ar: 'كل شيء طبيعي في هذا الوقت.',
  },
  seeAll: { en: 'See all', ar: 'عرض الكل' },
  observedAt: { en: 'Observed', ar: 'وقت الرصد' },
} satisfies Record<string, Text>
