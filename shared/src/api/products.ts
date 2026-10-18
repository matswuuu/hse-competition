import {get} from './client'

export interface ProductSource {
  name: string
  url: string
}

export const source = () => get<ProductSource>('/api/products/source')
