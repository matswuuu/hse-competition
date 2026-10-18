// §4.9 (P2): clickable mockup only — nothing is uploaded or recognised.
// Names come from `photo.sample`, in the same order.
export const PHOTO_SAMPLE = [
  { grams: 180, kcal: 198, p: 7.6, f: 2.0, c: 38.5 },
  { grams: 130, kcal: 214, p: 40.3, f: 4.7, c: 0 },
  { grams: 90, kcal: 14, p: 0.7, f: 0.1, c: 2.7 },
  { grams: 5, kcal: 45, p: 0, f: 5.0, c: 0 },
]

export const PHOTO_TOTAL = PHOTO_SAMPLE.reduce(
  (acc, i) => ({ kcal: acc.kcal + i.kcal, p: acc.p + i.p, f: acc.f + i.f, c: acc.c + i.c }),
  { kcal: 0, p: 0, f: 0, c: 0 },
)

/** Sample plate drawing as SVG primitives (element name + attributes). */
export const SAMPLE_PLATE = {
  viewBox: '0 0 200 200',
  shapes: [
    { type: 'rect', width: 200, height: 200, rx: 16, fill: '#e8dccb' },
    { type: 'circle', cx: 100, cy: 100, r: 82, fill: '#fafafa', stroke: '#ddd', strokeWidth: 3 },
    { type: 'circle', cx: 100, cy: 100, r: 64, fill: '#f2f2f2' },
    { type: 'path', d: 'M50 110 Q60 70 100 72 Q120 74 118 112 Q100 140 62 132 Z', fill: '#8b5a2b' },
    {
      type: 'path',
      d: 'M108 70 Q145 62 152 92 Q150 108 120 104 Z',
      fill: '#f1d9b5',
      stroke: '#d9b98c',
      strokeWidth: 2,
    },
    { type: 'circle', cx: 132, cy: 128, r: 11, fill: '#7fbf6a' },
    { type: 'circle', cx: 132, cy: 128, r: 6, fill: '#d8f0c8' },
    { type: 'circle', cx: 114, cy: 140, r: 10, fill: '#7fbf6a' },
    { type: 'circle', cx: 114, cy: 140, r: 5, fill: '#d8f0c8' },
  ],
} as const

export type PlateShape = (typeof SAMPLE_PLATE.shapes)[number]
