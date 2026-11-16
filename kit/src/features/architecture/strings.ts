import type { Text } from '../../types'

export const L = (en: string, ar: string): Text => ({ en, ar })

export const S = {
  title: L('Technology Architecture', 'البنية التقنية'),
  subtitle: L('From the source systems to the expert’s answer — on Cloudera, end to end', 'من الأنظمة المصدرية إلى إجابة الخبير — على منصة Cloudera من البداية إلى النهاية'),
  traceIncident: L('Trace the incident', 'تتبع الحادث'),
  traceIncidentAt: L('Trace the {time} incident', 'تتبع حادث {time}'),
  traceQuestion: L('Trace question', 'تتبع السؤال'),
  questionToTrace: L('Question to trace', 'السؤال المراد تتبعه'),
  dataFlow: L('Data flow', 'حركة البيانات'),
  deployment: L('Deployment', 'النشر'),
  residency: L('Residency', 'إقامة البيانات'),
  inSolution: L('In this solution', 'في هذا الحل'),
  data: L('Data', 'البيانات'),
  layer: L('Layer', 'الطبقة'),
  open: L('Open', 'افتح'),
  close: L('Close', 'إغلاق'),
  play: L('Play', 'تشغيل'),
  pause: L('Pause', 'إيقاف مؤقت'),
  connectedModel: L('Connected model', 'النموذج المتصل'),
  localEngine: L(
    'In this build the experts run on the local analysis engine; they connect to an OpenAI-compatible inference endpoint when one is configured.',
    'يعمل الخبراء في هذا الإصدار بمحرك تحليل محلي؛ ويتصلون بنقطة استدلال متوافقة مع OpenAI عند ضبطها.',
  ),
  notConnected: L('This demo runs on a reference snapshot and is not yet connected to this system.', 'يعمل هذا العرض على لقطة مرجعية وليس متصلاً بهذا النظام بعد.'),
  lineage: L('Lineage of one figure', 'تتبع أصل رقم'),
  showPath: L('Show the path on the diagram', 'عرض المسار على المخطط'),
  onRequest: L('{n} more on request', '{n} آخرون عند الطلب'),
  diagram: L('Architecture diagram', 'مخطط البنية'),
}
