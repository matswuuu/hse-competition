import type {PhotoRecognition} from './api/photo'

// §4.9 (P2): shown when the backend has no vision model configured, and as a demo.
// Names come from `photo.sample`, in the same order.
export const PHOTO_SAMPLE = [
  { grams: 180, kcal: 198, p: 7.6, f: 2.0, c: 38.5 },
  { grams: 130, kcal: 214, p: 40.3, f: 4.7, c: 0 },
  { grams: 90, kcal: 14, p: 0.7, f: 0.1, c: 2.7 },
  { grams: 5, kcal: 45, p: 0, f: 5.0, c: 0 },
]

/** The sample in the same shape as a real recognition result. */
export function sampleRecognition(names: string[]): PhotoRecognition {
  const items = PHOTO_SAMPLE.map((i, idx) => ({
    name: names[idx],
    productName: names[idx],
    grams: i.grams,
    facts: { kcal: i.kcal, proteinG: i.p, fatG: i.f, carbsG: i.c },
  }))
  const total = items.reduce(
    (acc, { facts: f }) => ({
      kcal: acc.kcal + f.kcal,
      proteinG: acc.proteinG + f.proteinG,
      fatG: acc.fatG + f.fatG,
      carbsG: acc.carbsG + f.carbsG,
    }),
    { kcal: 0, proteinG: 0, fatG: 0, carbsG: 0 },
  )
  return { items, total }
}

const MAX_SIDE = 1280

/** Barcodes and receipt QR codes need more pixels than a plate photo. */
export const CODE_MAX_SIDE = 2048

/**
 * Shrinks a photo to at most `maxSide` px on the long side as JPEG: phone shots are several MB,
 * and the model needs far less. Falls back to the original when the browser cannot decode it (e.g. HEIC).
 */
export async function downscalePhoto(file: File, maxSide = MAX_SIDE): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', maxSide > MAX_SIDE ? 0.92 : 0.85))
    return blob ?? file
  } catch {
    return file
  }
}

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
