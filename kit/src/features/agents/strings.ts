import type { Text } from '../../types'
import type { RobotState } from './RobotAvatar'

export const A = {
  team: { en: 'AI specialist team', ar: 'فريق المختصين بالذكاء الاصطناعي' },
  ready: { en: 'Ready', ar: 'جاهز' },
  working: { en: 'Working on your question', ar: 'يعمل على سؤالك' },
  lastRun: { en: 'Last answer: {n} of {m} specialists', ar: 'آخر إجابة: {n} من {m} مختصين' },
  hint: { en: 'Ask the expert a question to engage the team.', ar: 'اطرح سؤالاً على الخبير لإشراك الفريق.' },
  expand: { en: 'Expand', ar: 'توسيع' },
  collapse: { en: 'Collapse', ar: 'طي' },
  steps: { en: 'Steps of the latest answer', ar: 'خطوات آخر إجابة' },
  noRun: { en: 'No answer yet. The steps appear here once the team has worked on a question.', ar: 'لا توجد إجابة بعد. تظهر الخطوات هنا بعد أن يعمل الفريق على سؤال.' },
  question: { en: 'Question', ar: 'السؤال' },
  role: { en: 'Role', ar: 'الدور' },
  activities: { en: 'What it does', ar: 'ما يقوم به' },
  stage: { en: 'Stage', ar: 'المرحلة' },
  lead: { en: 'Lead', ar: 'القيادة' },
  analysis: { en: 'Analysis', ar: 'التحليل' },
  planning: { en: 'Planning', ar: 'التخطيط' },
  validation: { en: 'Validation', ar: 'التحقق' },
  briefing: { en: 'Briefing', ar: 'الإحاطة' },
  notCalled: { en: 'Not called', ar: 'لم يُستدعَ' },
  noSpecialists: { en: 'This expert answers directly from the demo data.', ar: 'يجيب هذا الخبير مباشرة من بيانات العرض.' },
} satisfies Record<string, Text>

export const ROBOT_STATUS: Record<RobotState, Text> = {
  idle: { en: 'Ready', ar: 'جاهز' },
  queued: { en: 'Queued', ar: 'في الانتظار' },
  working: { en: 'Working', ar: 'يعمل' },
  done: { en: 'Done', ar: 'تم' },
}
