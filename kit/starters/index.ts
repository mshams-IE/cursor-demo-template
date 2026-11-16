import type { Industry, Text } from '../src/types'

export interface StarterKpi {
  id: string
  label: Text
  kind: 'count' | 'percent' | 'measure'
  unit: Text
  /** Plausible range for an illustrative value. */
  range: [number, number]
  /** For counts: what the basis usually is, as an asset type id from the same starter. */
  basisType?: string
  worseWhenUp: boolean
  definition: Text
}

export interface Starter {
  industry: Industry
  assetTypes: { id: string; name: Text; plural: Text }[]
  kpis: StarterKpi[]
  incidents: { hero: Text[]; chronic: Text[] }
  expertRoles: { role: Text; focus: Text }[]
  refusals: { label: Text; keywords: string[] }[]
}

const COMMON_REFUSALS: Starter['refusals'] = [
  { label: { en: 'Tariffs and pricing', ar: 'التعرفة والأسعار' }, keywords: ['tariff', 'price', 'pricing', 'bill increase', 'تعرفة', 'أسعار', 'سعر'] },
  { label: { en: 'Named employees', ar: 'الموظفون بالاسم' }, keywords: ['employee performance', 'fire', 'salary', 'رواتب', 'أداء الموظف'] },
  { label: { en: 'Unannounced plans', ar: 'الخطط غير المعلنة' }, keywords: ['merger', 'acquisition', 'layoff', 'ipo', 'استحواذ', 'اندماج'] },
]

export const STARTERS: Record<'power' | 'water' | 'telecom' | 'aviation', Starter> = {
  water: {
    industry: 'water',
    assetTypes: [
      { id: 'plant', name: { en: 'Treatment plant', ar: 'محطة معالجة' }, plural: { en: 'treatment plants', ar: 'محطات معالجة' } },
      { id: 'desal', name: { en: 'Desalination plant', ar: 'محطة تحلية' }, plural: { en: 'desalination plants', ar: 'محطات تحلية' } },
      { id: 'pump', name: { en: 'Pumping station', ar: 'محطة ضخ' }, plural: { en: 'pumping stations', ar: 'محطات ضخ' } },
      { id: 'reservoir', name: { en: 'Reservoir', ar: 'خزان' }, plural: { en: 'reservoirs', ar: 'خزانات' } },
      { id: 'district', name: { en: 'Supply district', ar: 'منطقة إمداد' }, plural: { en: 'supply districts', ar: 'مناطق إمداد' } },
    ],
    kpis: [
      { id: 'nrw', label: { en: 'Non-revenue water', ar: 'المياه غير المدرة للدخل' }, kind: 'percent', unit: { en: 'of water supplied', ar: 'من المياه الموردة' }, range: [18, 32], worseWhenUp: true, definition: { en: 'Water produced but not billed: leaks, bursts, metering error and unbilled use, as a share of water supplied.', ar: 'المياه المنتجة غير المفوترة: التسربات والكسور وأخطاء القياس والاستهلاك غير المفوتر، كنسبة من المياه الموردة.' } },
      { id: 'bursts', label: { en: 'Pipe bursts today', ar: 'كسور الأنابيب اليوم' }, kind: 'measure', unit: { en: 'bursts', ar: 'كسراً' }, range: [2, 12], worseWhenUp: true, definition: { en: 'Confirmed main and service pipe bursts reported since midnight.', ar: 'كسور الأنابيب الرئيسية والفرعية المؤكدة منذ منتصف الليل.' } },
      { id: 'sites-attention', label: { en: 'Sites needing attention', ar: 'المواقع التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'monitored sites', ar: 'موقعاً مراقباً' }, range: [2, 8], worseWhenUp: true, definition: { en: 'Monitored sites whose status is watch or critical.', ar: 'المواقع المراقبة بحالة مراقبة أو حرجة.' } },
      { id: 'supply', label: { en: 'Supply reliability', ar: 'موثوقية الإمداد' }, kind: 'percent', unit: { en: 'of customers with continuous supply', ar: 'من العملاء بإمداد مستمر' }, range: [96, 99.8], worseWhenUp: false, definition: { en: 'Share of customers with uninterrupted supply over the last 24 hours.', ar: 'نسبة العملاء بإمداد دون انقطاع خلال آخر 24 ساعة.' } },
      { id: 'production', label: { en: 'Production', ar: 'الإنتاج' }, kind: 'measure', unit: { en: 'ML/day', ar: 'مليون لتر/يوم' }, range: [300, 1800], worseWhenUp: false, definition: { en: 'Treated water produced over the last 24 hours.', ar: 'المياه المعالجة المنتجة خلال آخر 24 ساعة.' } },
    ],
    incidents: {
      hero: [{ en: 'Trunk main burst at morning peak', ar: 'كسر في خط رئيسي وقت ذروة الصباح' }, { en: 'Desalination intake fouling', ar: 'انسداد مأخذ محطة التحلية' }],
      chronic: [{ en: 'Repeat leaks in an ageing pipe district', ar: 'تسربات متكررة في منطقة أنابيب قديمة' }, { en: 'Night-flow rise pointing to hidden leakage', ar: 'ارتفاع التدفق الليلي يشير إلى تسرب خفي' }],
    },
    expertRoles: [
      { role: { en: 'Network operations', ar: 'عمليات الشبكة' }, focus: { en: 'Bursts, pressure and supply interruptions right now.', ar: 'الكسور والضغط وانقطاعات الإمداد الآن.' } },
      { role: { en: 'Asset health', ar: 'صحة الأصول' }, focus: { en: 'Which pumps, plants and pipes are degrading, and why.', ar: 'أي المضخات والمحطات والأنابيب تتدهور ولماذا.' } },
      { role: { en: 'Customer experience', ar: 'تجربة العملاء' }, focus: { en: 'Who is affected, complaints and messaging.', ar: 'من المتأثرون والشكاوى والتواصل.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
  power: {
    industry: 'power',
    assetTypes: [
      { id: 'substation', name: { en: 'Substation', ar: 'محطة تحويل' }, plural: { en: 'substations', ar: 'محطات تحويل' } },
      { id: 'plant', name: { en: 'Generation plant', ar: 'محطة توليد' }, plural: { en: 'generation plants', ar: 'محطات توليد' } },
      { id: 'feeder', name: { en: 'Feeder', ar: 'مغذٍ' }, plural: { en: 'feeders', ar: 'مغذيات' } },
      { id: 'office', name: { en: 'Distribution office', ar: 'مكتب توزيع' }, plural: { en: 'distribution offices', ar: 'مكاتب توزيع' } },
    ],
    kpis: [
      { id: 'incidents', label: { en: 'Active incidents', ar: 'الحوادث النشطة' }, kind: 'measure', unit: { en: 'open now', ar: 'مفتوحة الآن' }, range: [3, 15], worseWhenUp: true, definition: { en: 'Incidents detected and not yet resolved.', ar: 'الحوادث المكتشفة وغير المحلولة بعد.' } },
      { id: 'customers-off', label: { en: 'Customers without supply', ar: 'العملاء دون تغذية' }, kind: 'measure', unit: { en: 'connections', ar: 'توصيلة' }, range: [800, 25000], worseWhenUp: true, definition: { en: 'Customer connections without supply now, counted once each.', ar: 'توصيلات العملاء دون تغذية الآن، محتسبة مرة واحدة.' } },
      { id: 'sites-attention', label: { en: 'Substations requiring attention', ar: 'المحطات التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'monitored substations', ar: 'محطة مراقبة' }, range: [3, 8], basisType: 'substation', worseWhenUp: true, definition: { en: 'Monitored substations whose status is watch or critical.', ar: 'المحطات المراقبة بحالة مراقبة أو حرجة.' } },
      { id: 'restoration', label: { en: 'Restoration progress', ar: 'تقدم الاستعادة' }, kind: 'percent', unit: { en: 'of affected customers restored', ar: 'من العملاء المتأثرين أعيدت خدمتهم' }, range: [55, 90], worseWhenUp: false, definition: { en: 'Of customers interrupted today, the share restored.', ar: 'من العملاء المنقطعة عنهم الخدمة اليوم، نسبة المستعادين.' } },
    ],
    incidents: {
      hero: [{ en: 'Transformer trip during peak load', ar: 'فصل محول أثناء ذروة الأحمال' }],
      chronic: [{ en: 'Repeat feeder trips from insulator contamination', ar: 'فصل متكرر للمغذيات بسبب تلوث العوازل' }],
    },
    expertRoles: [
      { role: { en: 'Grid operations', ar: 'عمليات الشبكة' }, focus: { en: 'Outages, restoration and loading now.', ar: 'الانقطاعات والاستعادة والأحمال الآن.' } },
      { role: { en: 'Asset health', ar: 'صحة الأصول' }, focus: { en: 'Transformer condition and failure risk.', ar: 'حالة المحولات ومخاطر الأعطال.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
  telecom: {
    industry: 'telecom',
    assetTypes: [
      { id: 'site', name: { en: 'Cell site', ar: 'موقع خلوي' }, plural: { en: 'cell sites', ar: 'مواقع خلوية' } },
      { id: 'exchange', name: { en: 'Exchange', ar: 'مقسم' }, plural: { en: 'exchanges', ar: 'مقاسم' } },
      { id: 'dc', name: { en: 'Data centre', ar: 'مركز بيانات' }, plural: { en: 'data centres', ar: 'مراكز بيانات' } },
      { id: 'fibre', name: { en: 'Fibre hub', ar: 'مركز ألياف' }, plural: { en: 'fibre hubs', ar: 'مراكز ألياف' } },
    ],
    kpis: [
      { id: 'availability', label: { en: 'Network availability', ar: 'توافر الشبكة' }, kind: 'percent', unit: { en: 'of site-hours today', ar: 'من ساعات المواقع اليوم' }, range: [99.2, 99.95], worseWhenUp: false, definition: { en: 'Share of cell-site hours in service since midnight.', ar: 'نسبة ساعات المواقع الخلوية في الخدمة منذ منتصف الليل.' } },
      { id: 'sites-attention', label: { en: 'Sites needing attention', ar: 'المواقع التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'monitored sites', ar: 'موقعاً مراقباً' }, range: [2, 9], worseWhenUp: true, definition: { en: 'Monitored sites whose status is watch or critical.', ar: 'المواقع المراقبة بحالة مراقبة أو حرجة.' } },
      { id: 'dropped', label: { en: 'Dropped-call rate', ar: 'معدل المكالمات المنقطعة' }, kind: 'percent', unit: { en: 'of calls', ar: 'من المكالمات' }, range: [0.3, 1.8], worseWhenUp: true, definition: { en: 'Calls ended abnormally by the network, as a share of all calls today.', ar: 'المكالمات التي أنهتها الشبكة بشكل غير طبيعي، كنسبة من مكالمات اليوم.' } },
      { id: 'churn-risk', label: { en: 'Customers at churn risk', ar: 'العملاء المعرضون للمغادرة' }, kind: 'measure', unit: { en: 'subscribers', ar: 'مشترك' }, range: [2000, 40000], worseWhenUp: true, definition: { en: 'Subscribers whose recent experience scores put them at high churn risk.', ar: 'المشتركون الذين تضعهم مؤشرات تجربتهم الأخيرة في خطر مغادرة مرتفع.' } },
    ],
    incidents: {
      hero: [{ en: 'Fibre cut isolating a cluster of sites', ar: 'قطع ألياف يعزل مجموعة مواقع' }, { en: 'Core congestion during a major event', ar: 'ازدحام الشبكة الأساسية أثناء فعالية كبرى' }],
      chronic: [{ en: 'Repeat power failures at rural sites', ar: 'انقطاعات كهرباء متكررة في المواقع الريفية' }],
    },
    expertRoles: [
      { role: { en: 'Network operations', ar: 'عمليات الشبكة' }, focus: { en: 'Outages, congestion and restoration now.', ar: 'الانقطاعات والازدحام والاستعادة الآن.' } },
      { role: { en: 'Customer experience', ar: 'تجربة العملاء' }, focus: { en: 'Who is affected and churn risk.', ar: 'من المتأثرون وخطر المغادرة.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
  aviation: {
    industry: 'aviation',
    assetTypes: [
      { id: 'airport', name: { en: 'Airport', ar: 'مطار' }, plural: { en: 'airports', ar: 'مطارات' } },
      { id: 'terminal', name: { en: 'Terminal', ar: 'صالة' }, plural: { en: 'terminals', ar: 'صالات' } },
      { id: 'hangar', name: { en: 'Maintenance hangar', ar: 'حظيرة صيانة' }, plural: { en: 'maintenance hangars', ar: 'حظائر صيانة' } },
    ],
    kpis: [
      { id: 'otp', label: { en: 'On-time performance', ar: 'الالتزام بالمواعيد' }, kind: 'percent', unit: { en: 'of departures within 15 min', ar: 'من الرحلات خلال 15 دقيقة' }, range: [72, 92], worseWhenUp: false, definition: { en: 'Departures leaving within 15 minutes of schedule today.', ar: 'الرحلات المغادرة خلال 15 دقيقة من موعدها اليوم.' } },
      { id: 'sites-attention', label: { en: 'Airports needing attention', ar: 'المطارات التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'airports served', ar: 'مطاراً مخدوماً' }, range: [1, 4], basisType: 'airport', worseWhenUp: true, definition: { en: 'Airports whose status is watch or critical.', ar: 'المطارات بحالة مراقبة أو حرجة.' } },
      { id: 'aog', label: { en: 'Aircraft on ground', ar: 'طائرات متوقفة' }, kind: 'measure', unit: { en: 'aircraft', ar: 'طائرة' }, range: [1, 6], worseWhenUp: true, definition: { en: 'Aircraft grounded for unplanned maintenance now.', ar: 'الطائرات المتوقفة لصيانة غير مخططة الآن.' } },
    ],
    incidents: {
      hero: [{ en: 'Sandstorm disrupting departures', ar: 'عاصفة رملية تعطل المغادرة' }],
      chronic: [{ en: 'Repeat baggage system faults', ar: 'أعطال متكررة في نظام الأمتعة' }],
    },
    expertRoles: [
      { role: { en: 'Operations control', ar: 'مركز التحكم بالعمليات' }, focus: { en: 'Delays, diversions and recovery now.', ar: 'التأخيرات والتحويلات والتعافي الآن.' } },
      { role: { en: 'Engineering', ar: 'الهندسة' }, focus: { en: 'Fleet health and maintenance risk.', ar: 'صحة الأسطول ومخاطر الصيانة.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
}
