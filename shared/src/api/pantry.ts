import {del, get, post, put} from './client'

export type PantrySource = 'MANUAL' | 'SHOPPING_LIST' | 'RECEIPT' | 'SCAN'

export interface PantryItem {
  id: number
  name: string
  category: string
  productId: number | null
  /** Catalog product it counts as for the shopping list and menus; null when unmatched. */
  catalogProductName: string | null
  grams: number
  /** ISO date; null when unknown. */
  expiresAt: string | null
  /** Negative once expired. */
  daysLeft: number | null
  source: PantrySource
}

export interface NewPantryItem {
  /** A known product, or a free-text `name`. */
  productId?: number | null
  name?: string | null
  grams: number
  expiresAt?: string | null
  /** Recorded as a purchase for spending analytics. */
  price?: number | null
  source?: PantrySource
}

export const list = () => get<PantryItem[]>('/api/pantry')

export const add = (item: NewPantryItem) => post<PantryItem>('/api/pantry', item)

export const addAll = (items: NewPantryItem[]) => post<PantryItem[]>('/api/pantry/batch', items)

export const update = (id: number, grams: number, expiresAt: string | null) =>
  put<PantryItem>(`/api/pantry/${id}`, { grams, expiresAt })

export const remove = (id: number) => del(`/api/pantry/${id}`)
