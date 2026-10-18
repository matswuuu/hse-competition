import {api, get} from './client'
import type {NutritionFacts} from './plans'

export interface RecognizedItem {
  name: string
  /** Null when the food is not in the product DB; its macros are then unknown. */
  productName: string | null
  grams: number
  facts: NutritionFacts | null
}

export interface PhotoRecognition {
  items: RecognizedItem[]
  /** Sum over matched items only. */
  total: NutritionFacts
}

export const status = () => get<{ available: boolean }>('/api/photo/status')

export function recognize(image: Blob) {
  const body = new FormData()
  body.append('file', image, 'photo.jpg')
  return api<PhotoRecognition>('/api/photo/recognize', { method: 'POST', body })
}
