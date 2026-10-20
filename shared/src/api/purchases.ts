import {del, get, post, upload} from './client'

export interface PurchaseItem {
  id: number
  name: string
  category: string
  /** Matched catalog product, if any. */
  productId: number | null
  productName: string | null
  price: number
  quantity: number
  sum: number
  /** Weight/volume read from the receipt line. */
  grams: number | null
  food: boolean
}

export interface Purchase {
  id: number
  purchasedAt: string
  store: string | null
  total: number
  source: 'RECEIPT' | 'MANUAL'
  items: PurchaseItem[]
}

export interface ReceiptImport {
  purchase: Purchase
  /** The receipt was imported before. */
  duplicate: boolean
}

export type Period = 'DAY' | 'WEEK' | 'MONTH'

export interface Spending {
  period: Period
  from: string
  to: string
  total: number
  averagePerBucket: number
  /** Oldest first. */
  buckets: { start: string; total: number }[]
  /** Largest first. */
  categories: { category: string; total: number; sharePct: number }[]
}

export const status = () => get<{ receiptsAvailable: boolean }>('/api/purchases/status')

export const receiptPhoto = (photo: Blob) => upload<ReceiptImport>('/api/purchases/receipt', photo)

export const receiptQr = (qrRaw: string) => post<ReceiptImport>('/api/purchases/receipt/qr', { qrRaw })

export const addManual = (name: string, price: number, date?: string) =>
  post<Purchase>('/api/purchases', { name, price, date })

export const recent = () => get<Purchase[]>('/api/purchases')

export const remove = (id: number) => del(`/api/purchases/${id}`)

export const spending = (period: Period) => get<Spending>(`/api/purchases/spending?period=${period}`)
