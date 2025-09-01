// 基本料理型（統一）
export interface Dish {
  id: string
  name: string
  description: string
  ingredients: string[]
  allergens: string[]
  keywords: string[]
  visual_keywords?: string[]
  imageUrls: string[]
  price?: number | null
  category: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  // Notion拡張フィールド
  name_en?: string
  chef_comment?: string
  recommendation?: string
  pairing_suggestion?: string
  nutritional_info?: NutritionalInfo
  seasonal?: boolean
  popular?: boolean
  notion_id?: string
}

// 栄養情報型
export interface NutritionalInfo {
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
}

// データベース用（JSON文字列フィールド）
export interface DishDB {
  id: string
  name: string
  description: string
  ingredients: string // JSON string
  allergens: string   // JSON string
  keywords: string    // JSON string
  visual_keywords?: string // JSON string
  imageUrls: string   // JSON string
  price?: number | null
  category: string
  active: boolean
  createdAt: Date
  updatedAt: Date
  name_en?: string
  chef_comment?: string
  recommendation?: string
  pairing_suggestion?: string
  nutritional_info?: string // JSON string
  seasonal?: boolean
  popular?: boolean
  notion_id?: string
}

// フォーム入力型
export interface CreateDishInput {
  name: string
  description: string
  ingredients: string[]
  allergens: string[]
  keywords: string[]
  visual_keywords?: string[]
  imageUrls: string[]
  price?: number | null
  category: string
}

// 更新用型
export interface UpdateDishInput extends Partial<CreateDishInput> {
  id: string
  active?: boolean
}

// 後方互換性のためのエイリアス
export type Menu = Dish
export type MenuDB = DishDB
export type CreateMenuInput = CreateDishInput
export type UpdateMenuInput = UpdateDishInput

// 原材料型
export interface Ingredient {
  id: string
  name: string
  name_en?: string
  category?: string
  allergen_type?: string
  description?: string
  createdAt: Date
}

export interface Allergen {
  id: string
  name: string
  name_en?: string
  severity: 'high' | 'medium' | 'low'
  warning_message?: string
  icon_url?: string
  created_at: string
}

// 画像解析結果型
export interface ImageAnalysisResult {
  confidence: number
  detectedItems: string[]
  suggestedDishes: Dish[]
  usingVisionAPI: boolean
  analysisTime?: number
  debugInfo?: any
}
