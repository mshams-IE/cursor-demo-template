import type { Text } from '../../types'

export const MAP = {
  layerStatus: { en: 'Status', ar: 'الحالة' },
  layerIncidents: { en: 'Incidents', ar: 'الحوادث' },
  legend: { en: 'Legend', ar: 'دليل الألوان' },
  view3d: { en: '3D view', ar: 'عرض ثلاثي الأبعاد' },
  zoomIn: { en: 'Zoom in', ar: 'تكبير' },
  zoomOut: { en: 'Zoom out', ar: 'تصغير' },
  fitAll: { en: 'Show everything', ar: 'عرض الكل' },
  mapZoom: { en: 'Map zoom', ar: 'تكبير الخريطة' },
  mapLayer: { en: 'Map layer', ar: 'طبقة الخريطة' },
  affected: { en: 'affected', ar: 'متأثرة' },
  activeIncidents: { en: 'Active incidents', ar: 'الحوادث النشطة' },
  impact: { en: 'Impact', ar: 'الأثر' },
  attention: { en: 'Need attention', ar: 'تتطلب الانتباه' },
  noIncident: { en: 'No active incident', ar: 'لا توجد حادثة نشطة' },
  incidentSize: {
    en: 'Marker size: impact of active incidents',
    ar: 'حجم العلامة: أثر الحوادث النشطة',
  },
  incidentShade: {
    en: 'Shading: impact in the region',
    ar: 'التظليل: الأثر في المنطقة',
  },
  incidentBubble: { en: 'Bubble: total impact', ar: 'الفقاعة: إجمالي الأثر' },
  overLimit: { en: 'At or beyond the limit', ar: 'عند الحد أو تجاوزه' },
  nearLimit: { en: 'Within 10% of the limit', ar: 'ضمن 10% من الحد' },
  withinLimit: { en: 'Within the limit', ar: 'ضمن الحد' },
  worstThird: { en: 'Worst third', ar: 'الثلث الأسوأ' },
  middleThird: { en: 'Middle third', ar: 'الثلث الأوسط' },
  bestThird: { en: 'Best third', ar: 'الثلث الأفضل' },
  noReading: { en: 'No reading', ar: 'لا توجد قراءة' },
  metricBubble: {
    en: 'Bubble: flagged readings in the region',
    ar: 'الفقاعة: القراءات المنبّهة في المنطقة',
  },
  height3d: {
    en: 'Height: the selected layer',
    ar: 'الارتفاع: حسب الطبقة المختارة',
  },
  limit: { en: 'limit', ar: 'الحد' },
} satisfies Record<string, Text>
