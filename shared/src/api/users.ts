import {post} from './client'

export interface User {
  id: number
  username: string
  createdAt: string
}

export interface Credentials {
  username: string
  password: string
}

export const login = (data: Credentials) => post<User>('/api/users/login', data)

export const signup = (data: Credentials) => post<User>('/api/users/signup', data)
