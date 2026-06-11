export type Category = 'electronics' | 'beauty' | 'home' | 'fashion' | 'sport'

export interface Tier {
  min: number
  priceKzt: number
}

export interface Product {
  id: string
  title: string
  brand: string | null
  category: Category
  image: string
  images: string[]
  rating: number
  retailKzt: number
  tiers: Tier[]
  seedMembers: number
  hoursLeft: number
  marketplace: string
  hotCities: string[]
  shipDays: number
}

export interface Profile {
  name: string
  phone: string
  city: string
  age: number
  budgetKzt: number
  interests: Category[]
  lang: 'ru' | 'kk'
  esimId: string
  operator: string
  onboarded: boolean
}

export type GroupStatus = 'filling' | 'complete' | 'expired'

export interface GroupState {
  extraMembers: number
  joined: boolean
  joinedAt?: number
  deadline: number
}

export interface Reco {
  product: Product
  score: number
  reasons: string[]
}
