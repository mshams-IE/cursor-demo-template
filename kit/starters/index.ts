import type { Industry, Text, Vocabulary } from '../src/types'

export interface StarterKpi {
  id: string
  label: Text
  kind: 'count' | 'percent' | 'measure'
  unit: Text
  /** Plausible range for an illustrative value. */
  range: [number, number]
  decimals?: number
  /** For counts: what the basis usually is, as an asset type id from the same starter. */
  basisType?: string
  worseWhenUp: boolean
  definition: Text
}

export interface Starter {
  industry: Industry | 'generic'
  /** Suggested wording for sites, regions and asset types; omit to keep "Site" and "Region". */
  vocabulary?: Vocabulary
  /** Whether this industry usually maps to geography. If false, suggest no map (groups show as tiles). */
  defaultGeo: boolean
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

export const STARTERS: Partial<Record<Industry, Starter>> & { generic: Starter } = {
  water: {
    industry: 'water',
    defaultGeo: true,
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
    defaultGeo: true,
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
    defaultGeo: true,
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
    defaultGeo: true,
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
  banking: {
    industry: 'banking',
    defaultGeo: false,
    vocabulary: {
      entity: { en: 'Branch', ar: 'الفرع' },
      entityPlural: { en: 'Branches', ar: 'الفروع' },
      group: { en: 'Business line', ar: 'قطاع الأعمال' },
      groupPlural: { en: 'Business lines', ar: 'قطاعات الأعمال' },
      type: { en: 'Channel', ar: 'القناة' },
      typePlural: { en: 'Channels', ar: 'القنوات' },
    },
    assetTypes: [
      { id: 'branch', name: { en: 'Branch', ar: 'فرع' }, plural: { en: 'branches', ar: 'فروع' } },
      { id: 'atm', name: { en: 'ATM cluster', ar: 'مجموعة صرافات' }, plural: { en: 'ATM clusters', ar: 'مجموعات صرافات' } },
      { id: 'digital', name: { en: 'Digital channel', ar: 'قناة رقمية' }, plural: { en: 'digital channels', ar: 'قنوات رقمية' } },
      { id: 'centre', name: { en: 'Service centre', ar: 'مركز خدمة' }, plural: { en: 'service centres', ar: 'مراكز خدمة' } },
    ],
    kpis: [
      { id: 'sites-attention', label: { en: 'Channels needing attention', ar: 'القنوات التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'monitored channels', ar: 'قناة مراقبة' }, range: [2, 8], worseWhenUp: true, definition: { en: 'Monitored branches and channels whose status is watch or critical.', ar: 'الفروع والقنوات المراقبة بحالة مراقبة أو حرجة.' } },
      { id: 'fraud', label: { en: 'Fraud alerts today', ar: 'تنبيهات الاحتيال اليوم' }, kind: 'measure', unit: { en: 'alerts', ar: 'تنبيهاً' }, range: [40, 400], worseWhenUp: true, definition: { en: 'Transactions flagged by fraud models since midnight and waiting for review.', ar: 'المعاملات التي رصدتها نماذج الاحتيال منذ منتصف الليل وتنتظر المراجعة.' } },
      { id: 'digital-uptime', label: { en: 'Digital availability', ar: 'توافر القنوات الرقمية' }, kind: 'percent', unit: { en: 'of minutes today', ar: 'من دقائق اليوم' }, range: [99.0, 99.95], worseWhenUp: false, decimals: 2, definition: { en: 'Share of minutes since midnight in which mobile and online banking were fully available.', ar: 'نسبة الدقائق منذ منتصف الليل التي كانت فيها الخدمات المصرفية عبر الجوال والإنترنت متاحة بالكامل.' } },
      { id: 'nps', label: { en: 'Customer satisfaction', ar: 'رضا العملاء' }, kind: 'percent', unit: { en: 'of surveyed customers satisfied', ar: 'من العملاء المستطلعين راضون' }, range: [70, 90], worseWhenUp: false, definition: { en: 'Customers who rated their last interaction 4 or 5 out of 5 this week.', ar: 'العملاء الذين قيّموا آخر تعامل لهم بـ 4 أو 5 من 5 هذا الأسبوع.' } },
    ],
    incidents: {
      hero: [{ en: 'Card payments failing at peak hour', ar: 'تعطل مدفوعات البطاقات وقت الذروة' }, { en: 'Spike in account-takeover attempts', ar: 'ارتفاع محاولات الاستيلاء على الحسابات' }],
      chronic: [{ en: 'Repeat cash-outs at an ATM cluster', ar: 'نفاد النقد المتكرر في مجموعة صرافات' }, { en: 'Long branch queues on salary day', ar: 'طوابير طويلة في الفروع يوم صرف الرواتب' }],
    },
    expertRoles: [
      { role: { en: 'Channel operations', ar: 'عمليات القنوات' }, focus: { en: 'Outages, queues and failed transactions now.', ar: 'الأعطال والطوابير والمعاملات الفاشلة الآن.' } },
      { role: { en: 'Financial crime', ar: 'الجرائم المالية' }, focus: { en: 'Fraud alerts, patterns and exposure.', ar: 'تنبيهات الاحتيال وأنماطه والتعرض.' } },
      { role: { en: 'Customer experience', ar: 'تجربة العملاء' }, focus: { en: 'Satisfaction, complaints and who is affected.', ar: 'الرضا والشكاوى ومن المتأثرون.' } },
    ],
    refusals: [
      { label: { en: 'Named customers', ar: 'العملاء بالاسم' }, keywords: ['account balance', 'customer name', 'رصيد', 'اسم العميل'] },
      { label: { en: 'Interest rates and pricing', ar: 'أسعار الفائدة والتسعير' }, keywords: ['interest rate', 'pricing', 'fees', 'سعر الفائدة', 'رسوم'] },
      ...COMMON_REFUSALS.slice(1),
    ],
  },
  retail: {
    industry: 'retail',
    defaultGeo: true,
    vocabulary: {
      entity: { en: 'Store', ar: 'المتجر' },
      entityPlural: { en: 'Stores', ar: 'المتاجر' },
      group: { en: 'Region', ar: 'المنطقة' },
      groupPlural: { en: 'Regions', ar: 'المناطق' },
      type: { en: 'Format', ar: 'الصيغة' },
      typePlural: { en: 'Formats', ar: 'الصيغ' },
    },
    assetTypes: [
      { id: 'hyper', name: { en: 'Hypermarket', ar: 'هايبرماركت' }, plural: { en: 'hypermarkets', ar: 'هايبرماركت' } },
      { id: 'super', name: { en: 'Supermarket', ar: 'سوبرماركت' }, plural: { en: 'supermarkets', ar: 'سوبرماركت' } },
      { id: 'express', name: { en: 'Express store', ar: 'متجر سريع' }, plural: { en: 'express stores', ar: 'متاجر سريعة' } },
      { id: 'dc', name: { en: 'Distribution centre', ar: 'مركز توزيع' }, plural: { en: 'distribution centres', ar: 'مراكز توزيع' } },
    ],
    kpis: [
      { id: 'sites-attention', label: { en: 'Stores needing attention', ar: 'المتاجر التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'stores', ar: 'متجراً' }, range: [2, 10], worseWhenUp: true, definition: { en: 'Stores whose status is watch or critical.', ar: 'المتاجر بحالة مراقبة أو حرجة.' } },
      { id: 'availability', label: { en: 'On-shelf availability', ar: 'توافر المنتجات على الرفوف' }, kind: 'percent', unit: { en: 'of tracked products', ar: 'من المنتجات المتتبعة' }, range: [92, 98.5], worseWhenUp: false, decimals: 1, definition: { en: 'Tracked products on the shelf at the last scan.', ar: 'المنتجات المتتبعة الموجودة على الرف عند آخر مسح.' } },
      { id: 'sales', label: { en: 'Sales against plan', ar: 'المبيعات مقابل الخطة' }, kind: 'percent', unit: { en: 'of plan to date', ar: 'من خطة الفترة حتى الآن' }, range: [88, 106], worseWhenUp: false, definition: { en: 'Sales since opening as a share of the plan for the same hours.', ar: 'المبيعات منذ الافتتاح كنسبة من الخطة للساعات نفسها.' } },
      { id: 'waste', label: { en: 'Fresh waste', ar: 'هدر المنتجات الطازجة' }, kind: 'percent', unit: { en: 'of fresh sales', ar: 'من مبيعات الطازج' }, range: [2, 6], worseWhenUp: true, decimals: 1, definition: { en: 'Fresh products written off this week, as a share of fresh sales.', ar: 'المنتجات الطازجة المشطوبة هذا الأسبوع كنسبة من مبيعات الطازج.' } },
    ],
    incidents: {
      hero: [{ en: 'Cold-chain failure at a distribution centre', ar: 'عطل في سلسلة التبريد بمركز توزيع' }, { en: 'Point-of-sale outage at peak trading', ar: 'تعطل نقاط البيع وقت ذروة التسوق' }],
      chronic: [{ en: 'Repeat out-of-stocks on top lines', ar: 'نفاد متكرر لأكثر المنتجات مبيعاً' }],
    },
    expertRoles: [
      { role: { en: 'Store operations', ar: 'عمليات المتاجر' }, focus: { en: 'Which stores are struggling now and why.', ar: 'أي المتاجر تواجه صعوبة الآن ولماذا.' } },
      { role: { en: 'Supply chain', ar: 'سلسلة الإمداد' }, focus: { en: 'Stock, deliveries and waste.', ar: 'المخزون والتوريد والهدر.' } },
      { role: { en: 'Customer insight', ar: 'رؤى العملاء' }, focus: { en: 'Footfall, basket and loyalty trends.', ar: 'الإقبال وسلة الشراء واتجاهات الولاء.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
  healthcare: {
    industry: 'healthcare',
    defaultGeo: true,
    vocabulary: {
      entity: { en: 'Facility', ar: 'المنشأة' },
      entityPlural: { en: 'Facilities', ar: 'المنشآت' },
      group: { en: 'Cluster', ar: 'التجمع الصحي' },
      groupPlural: { en: 'Clusters', ar: 'التجمعات الصحية' },
      type: { en: 'Facility type', ar: 'نوع المنشأة' },
      typePlural: { en: 'Facility types', ar: 'أنواع المنشآت' },
    },
    assetTypes: [
      { id: 'hospital', name: { en: 'Hospital', ar: 'مستشفى' }, plural: { en: 'hospitals', ar: 'مستشفيات' } },
      { id: 'phc', name: { en: 'Primary care centre', ar: 'مركز رعاية أولية' }, plural: { en: 'primary care centres', ar: 'مراكز رعاية أولية' } },
      { id: 'ed', name: { en: 'Emergency department', ar: 'قسم طوارئ' }, plural: { en: 'emergency departments', ar: 'أقسام طوارئ' } },
      { id: 'lab', name: { en: 'Laboratory', ar: 'مختبر' }, plural: { en: 'laboratories', ar: 'مختبرات' } },
    ],
    kpis: [
      { id: 'sites-attention', label: { en: 'Facilities needing attention', ar: 'المنشآت التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'facilities', ar: 'منشأة' }, range: [2, 8], worseWhenUp: true, definition: { en: 'Facilities whose status is watch or critical.', ar: 'المنشآت بحالة مراقبة أو حرجة.' } },
      { id: 'occupancy', label: { en: 'Bed occupancy', ar: 'إشغال الأسرّة' }, kind: 'percent', unit: { en: 'of staffed beds', ar: 'من الأسرّة المشغّلة' }, range: [78, 96], worseWhenUp: true, definition: { en: 'Staffed inpatient beds occupied at the last census.', ar: 'الأسرّة المشغّلة المشغولة عند آخر حصر.' } },
      { id: 'ed-wait', label: { en: 'Emergency wait', ar: 'الانتظار في الطوارئ' }, kind: 'measure', unit: { en: 'minutes, median', ar: 'دقيقة، الوسيط' }, range: [25, 120], worseWhenUp: true, definition: { en: 'Median time from arrival to first assessment in emergency departments today.', ar: 'الوسيط الزمني من الوصول حتى أول تقييم في أقسام الطوارئ اليوم.' } },
      { id: 'appointments', label: { en: 'Appointments kept', ar: 'المواعيد المنجزة' }, kind: 'percent', unit: { en: 'of booked appointments', ar: 'من المواعيد المحجوزة' }, range: [80, 94], worseWhenUp: false, definition: { en: 'Outpatient appointments attended this week, as a share of those booked.', ar: 'مواعيد العيادات الخارجية المنجزة هذا الأسبوع كنسبة من المحجوزة.' } },
    ],
    incidents: {
      hero: [{ en: 'Emergency department surge after a road accident', ar: 'ضغط على الطوارئ بعد حادث مروري' }, { en: 'Bed shortage during a respiratory wave', ar: 'نقص الأسرّة خلال موجة أمراض تنفسية' }],
      chronic: [{ en: 'Repeat no-shows at outpatient clinics', ar: 'تغيب متكرر عن مواعيد العيادات الخارجية' }],
    },
    expertRoles: [
      { role: { en: 'Patient flow', ar: 'تدفق المرضى' }, focus: { en: 'Beds, waits and transfers right now.', ar: 'الأسرّة والانتظار والتحويلات الآن.' } },
      { role: { en: 'Clinical quality', ar: 'الجودة السريرية' }, focus: { en: 'Readmissions, safety events and outcomes.', ar: 'إعادة الدخول وأحداث السلامة والنتائج.' } },
      { role: { en: 'Workforce', ar: 'القوى العاملة' }, focus: { en: 'Staffing gaps and rosters.', ar: 'فجوات التوظيف والجداول.' } },
    ],
    refusals: [
      { label: { en: 'Named patients', ar: 'المرضى بالاسم' }, keywords: ['patient name', 'medical record', 'diagnosis of', 'اسم المريض', 'السجل الطبي'] },
      ...COMMON_REFUSALS,
    ],
  },
  generic: {
    industry: 'generic',
    defaultGeo: false,
    vocabulary: {
      entity: { en: 'Unit', ar: 'الوحدة' },
      entityPlural: { en: 'Units', ar: 'الوحدات' },
      group: { en: 'Division', ar: 'القطاع' },
      groupPlural: { en: 'Divisions', ar: 'القطاعات' },
      type: { en: 'Type', ar: 'النوع' },
      typePlural: { en: 'Types', ar: 'الأنواع' },
    },
    assetTypes: [
      { id: 'operation', name: { en: 'Operating unit', ar: 'وحدة تشغيلية' }, plural: { en: 'operating units', ar: 'وحدات تشغيلية' } },
      { id: 'service', name: { en: 'Service', ar: 'خدمة' }, plural: { en: 'services', ar: 'خدمات' } },
      { id: 'programme', name: { en: 'Programme', ar: 'برنامج' }, plural: { en: 'programmes', ar: 'برامج' } },
    ],
    kpis: [
      { id: 'sites-attention', label: { en: 'Units needing attention', ar: 'الوحدات التي تتطلب الانتباه' }, kind: 'count', unit: { en: 'monitored units', ar: 'وحدة مراقبة' }, range: [2, 8], worseWhenUp: true, definition: { en: 'Monitored units whose status is watch or critical.', ar: 'الوحدات المراقبة بحالة مراقبة أو حرجة.' } },
      { id: 'on-target', label: { en: 'On target', ar: 'ضمن المستهدف' }, kind: 'percent', unit: { en: 'of tracked targets', ar: 'من المستهدفات المتتبعة' }, range: [70, 92], worseWhenUp: false, definition: { en: 'Tracked targets currently on or ahead of plan.', ar: 'المستهدفات المتتبعة التي تسير وفق الخطة أو أفضل حالياً.' } },
      { id: 'open-issues', label: { en: 'Open issues', ar: 'المشكلات المفتوحة' }, kind: 'measure', unit: { en: 'open now', ar: 'مفتوحة الآن' }, range: [5, 40], worseWhenUp: true, definition: { en: 'Issues raised and not yet resolved.', ar: 'المشكلات المرفوعة وغير المحلولة بعد.' } },
      { id: 'sla', label: { en: 'Service level', ar: 'مستوى الخدمة' }, kind: 'percent', unit: { en: 'of requests within target time', ar: 'من الطلبات ضمن الوقت المستهدف' }, range: [85, 98], worseWhenUp: false, definition: { en: 'Requests completed within their target time this week.', ar: 'الطلبات المنجزة ضمن وقتها المستهدف هذا الأسبوع.' } },
    ],
    incidents: {
      hero: [{ en: 'Critical system outage', ar: 'عطل في نظام حيوي' }, { en: 'Sudden spike in demand', ar: 'ارتفاع مفاجئ في الطلب' }],
      chronic: [{ en: 'Backlog building in one unit', ar: 'تراكم الأعمال في إحدى الوحدات' }],
    },
    expertRoles: [
      { role: { en: 'Operations', ar: 'العمليات' }, focus: { en: 'What needs attention right now and why.', ar: 'ما يتطلب الانتباه الآن ولماذا.' } },
      { role: { en: 'Performance', ar: 'الأداء' }, focus: { en: 'Targets, trends and where the gaps are.', ar: 'المستهدفات والاتجاهات وأين الفجوات.' } },
      { role: { en: 'Customer experience', ar: 'تجربة العملاء' }, focus: { en: 'Who is affected and how they feel.', ar: 'من المتأثرون وما انطباعهم.' } },
    ],
    refusals: COMMON_REFUSALS,
  },
}

/** The starter for an industry, or the generic starter when the industry has none. */
export function starterFor(industry: Industry | undefined): Starter {
  return (industry && STARTERS[industry]) || STARTERS.generic
}
