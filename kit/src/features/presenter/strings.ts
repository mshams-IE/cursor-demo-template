import type { Text } from '../../types'

const L = (en: string, ar: string): Text => ({ en, ar })

export const S = {
  defaultStory: L('Default', 'الافتراضي'),
  stories: L('Stories', 'القصص'),
  chooseStory: L('Choose a story', 'اختر قصة'),
  beats: L('Beats', 'المقاطع'),
  startStory: L('Start the story', 'ابدأ القصة'),
  noBeats: L('This pack has no presenter beats yet.', 'لا توجد مقاطع عرض في هذه الحزمة بعد.'),
  keys: L('← → move · Space play or pause · Esc close', '← → للتنقل · مسافة للتشغيل أو الإيقاف · Esc للإغلاق'),
}
