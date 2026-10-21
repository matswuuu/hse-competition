import {del, get, patch, post} from './client'

export type MealType = 'BREAKFAST' | 'SNACK' | 'LUNCH' | 'SNACK_2' | 'DINNER'

export interface NutritionFacts {
  kcal: number
  proteinG: number
  fatG: number
  carbsG: number
}

export interface DayTargets {
  trainingDay: NutritionFacts
  restDay: NutritionFacts
}

export interface MealSummary {
  id: number
  mealType: MealType
  dishName: string
  cookingTimeMin: number
  eaten: boolean
  /** The user's own meal in place of the planned dish. */
  custom: boolean
  facts: NutritionFacts
}

export interface DayView {
  dayId: number
  /** 0-based position in the week. */
  dayIndex: number
  date: string
  trainingDay: boolean
  targets: NutritionFacts
  totals: NutritionFacts
  withinTolerance: boolean
  deviationPct: number
  meals: MealSummary[]
  /** The user put in an own meal, the day went off target and planned meals are left to adjust. */
  rebalanceAvailable: boolean
}

export interface Week {
  planId: number
  startDate: string
  fallbackUsed: boolean
  generationTimeMs: number | null
  days: DayView[]
  /** Fridge products the remaining meals use. */
  fridgeProducts: string[]
}

export interface Ingredient {
  productName: string
  /** Null with `facts` for a food not in the product DB (own meals only): it is not counted. */
  category: string | null
  grams: number
  facts: NutritionFacts | null
}

export interface DishCard {
  mealId: number
  dayId: number
  mealType: MealType
  dishName: string
  cookingTimeMin: number
  eaten: boolean
  custom: boolean
  facts: NutritionFacts
  ingredients: Ingredient[]
  steps: string[]
  recipeUrls: string[]
}

export interface ShoppingItem {
  productId: number
  productName: string
  /** What the remaining (not eaten) meals of the plan need. */
  neededGrams: number
  inFridgeGrams: number
  /** 0 when the fridge already covers it. */
  toBuyGrams: number
}

export interface ShoppingList {
  categories: { category: string; items: ShoppingItem[] }[]
  /** Removed from this plan's list by the user. */
  dismissed: { productId: number; productName: string }[]
}

export const generate = () => post<Week>('/api/plans/generate')

export const current = () => get<Week>('/api/plans/current')

export const shoppingList = () => get<ShoppingList>('/api/plans/current/shopping-list')

export const dismissShoppingItem = (productId: number) =>
  del<ShoppingList>(`/api/plans/current/shopping-list/items/${productId}`)

export const restoreShoppingItem = (productId: number) =>
  post<ShoppingList>(`/api/plans/current/shopping-list/items/${productId}/restore`)

export const targets = () => get<DayTargets>('/api/questionnaire/targets')

export const dish = (mealId: number) => get<DishCard>(`/api/meals/${mealId}`)

export const setEaten = (mealId: number, eaten: boolean) => patch<DishCard>(`/api/meals/${mealId}/eaten`, { eaten })

/** Refits the day's remaining planned meals around the user's own ones. */
export const rebalanceDay = (dayIndex: number) => post<DayView>(`/api/plans/current/days/${dayIndex}/rebalance`)

export const replace = (mealId: number) => post<DishCard>(`/api/meals/${mealId}/replace`)

export interface CustomMeal {
  dishName: string
  /** `grams` in the product's dry/raw state; `productName` null for a food not in the DB. */
  items: { name: string; productName: string | null; grams: number }[]
  eaten: boolean
}

export const replaceWithCustom = (mealId: number, meal: CustomMeal) =>
  post<DishCard>(`/api/meals/${mealId}/custom`, meal)
