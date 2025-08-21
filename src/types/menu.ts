// 基本メニュー型（統一）
export interface Menu {
  id: string
  name: string
  description: string
  ingredients: string[]
  allergens: string[]
  keywords: string[]
  imageUrls: string[]
  price?: number | null
  category: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// データベース用（JSON文字列フィールド）
export interface MenuDB {
  id: string
  name: string
  description: string
  ingredients: string // JSON string
  allergens: string   // JSON string
  keywords: string    // JSON string
  imageUrls: string   // JSON string
  price?: number | null
  category: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

// フォーム入力型
export interface CreateMenuInput {
  name: string
  description: string
  ingredients: string[]
  allergens: string[]
  keywords: string[]
  imageUrls: string[]
  price?: number | null
  category: string
}

// 更新用型
export interface UpdateMenuInput extends Partial<CreateMenuInput> {
  id: string
  active?: boolean
}

// Notion用拡張型
export interface Dish extends Menu {
  name_en?: string
  chef_comment?: string
  recommendation?: string
  pairing_suggestion?: string
  nutritional_info?: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  visual_keywords?: string[]
  seasonal?: boolean
  popular?: boolean
  notion_id?: string
}

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
