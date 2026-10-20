import {get, put} from './client'

/** Account settings the backend acts on (UI preferences stay on the device). */
export interface AccountSettings {
  /** Build menus around fridge products that expire soon. */
  useFridgeInPlanning: boolean
}

export const load = () => get<AccountSettings>('/api/settings')

export const update = (settings: AccountSettings) => put<AccountSettings>('/api/settings', settings)
