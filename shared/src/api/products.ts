import {api, get, upload} from './client'

export interface ProductSource {
  name: string
  url: string
}

export type ProductOrigin = 'CATALOG' | 'OPEN_FOOD_FACTS' | 'USER'

/** Macros per 100 g. */
export interface Product {
  id: number
  name: string
  category: string
  kcalPer100g: number
  proteinPer100g: number
  fatPer100g: number
  carbsPer100g: number
  barcode: string | null
  source: ProductOrigin
}

export interface ProductScan {
  /** NEED_LABEL: unknown product — ask for a photo of the label and a name. */
  status: 'FOUND' | 'NEED_LABEL'
  product: Product | null
  barcode: string | null
  suggestedName: string | null
  via: 'BARCODE_LOCAL' | 'OPEN_FOOD_FACTS' | 'VISION' | 'NONE'
}

export interface LabelProduct {
  name: string
  barcode?: string | null
  category?: string | null
  kcal?: number | null
  protein?: number | null
  fat?: number | null
  carbs?: number | null
}

export const source = () => get<ProductSource>('/api/products/source')

export const search = (query: string) => get<Product[]>(`/api/products?search=${encodeURIComponent(query)}`)

export const categories = () => get<string[]>('/api/products/categories')

export const scanStatus = () => get<{ visionAvailable: boolean }>('/api/products/scan/status')

export const scan = (photo: Blob) => upload<ProductScan>('/api/products/scan', photo)

/** Answers 422 when the macros could not be read from the label and were not typed in. */
export function createFromLabel(product: LabelProduct, label: Blob | null) {
  const body = new FormData()
  body.append('product', new Blob([JSON.stringify(product)], { type: 'application/json' }))
  if (label) body.append('label', label, 'label.jpg')
  return api<Product>('/api/products/custom', { method: 'POST', body })
}
