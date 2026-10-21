import {api, get, post} from './client'
import type {NutritionFacts} from './plans'

export interface RecognizedItem {
  name: string
  /** Null when the food is not in the product DB; its macros are then unknown. */
  productName: string | null
  /** Portion as eaten. */
  grams: number
  /** The same portion in the product's dry/raw state, what КБЖУ is computed from; null when not matched. */
  productGrams: number | null
  facts: NutritionFacts | null
}

export interface PhotoRecognition {
  /** Short name of the meal from the model, when it gave one. */
  dishName: string | null
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

/** The same recognition for a meal described in words. */
export const describe = (text: string) => post<PhotoRecognition>('/api/photo/describe', { text })
