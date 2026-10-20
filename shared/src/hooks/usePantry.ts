import {useCallback, useEffect, useState} from 'react'
import type {NewPantryItem, PantryItem} from '../api/pantry'
import * as pantryApi from '../api/pantry'

/** The fridge, soonest to expire first. Mutations reload the list (the server merges and sorts). */
export function usePantry() {
  const [items, setItems] = useState<PantryItem[] | null>(null)
  const [error, setError] = useState(false)

  const reload = useCallback(async () => {
    try {
      setItems(await pantryApi.list())
      setError(false)
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  async function add(item: NewPantryItem | NewPantryItem[]) {
    await (Array.isArray(item) ? pantryApi.addAll(item) : pantryApi.add(item))
    await reload()
  }

  async function update(id: number, grams: number, expiresAt: string | null) {
    await pantryApi.update(id, grams, expiresAt)
    await reload()
  }

  async function remove(id: number) {
    setItems((prev) => prev?.filter((i) => i.id !== id) ?? prev)
    try {
      await pantryApi.remove(id)
    } finally {
      await reload()
    }
  }

  return { items, error, reload, add, update, remove }
}
