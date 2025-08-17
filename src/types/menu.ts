export interface Menu {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  keywords: string[];
  imageUrls: string[];
  price?: number;
  category: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuDB {
  id: string;
  name: string;
  description: string;
  ingredients: string; // JSON string
  allergens: string;   // JSON string
  keywords: string;    // JSON string
  imageUrls: string;   // JSON string
  price?: number;
  category: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMenuInput {
  name: string;
  description: string;
  ingredients: string[];
  allergens: string[];
  keywords: string[];
  imageUrls: string[];
  price?: number;
  category: string;
}

export interface UpdateMenuInput extends Partial<CreateMenuInput> {
  id: string;
  active?: boolean;
}

export interface Dish {
  id: string
  name: string
  name_en?: string
  description?: string
  price?: number
  category: string
  
  // 店舗メッセージ
  chef_comment?: string
  recommendation?: string
  pairing_suggestion?: string
  
  // 食材・アレルギー
  ingredients: string[]
  allergens: string[]
  nutritional_info: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  
  // AI用
  keywords: string[]
  visual_keywords: string[]
  
  // 画像・ステータス
  image_urls: string[]
  available: boolean
  seasonal: boolean
  popular: boolean
  
  created_at: string
  updated_at: string
  notion_id?: string
}

export interface Ingredient {
  id: string
  name: string
  name_en?: string
  category?: string
  allergen_type?: string
  description?: string
  created_at: string
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

export interface ImageAnalysisResult {
  confidence: number
  detectedItems: string[]
  suggestedDishes: Dish[]
  usingVisionAPI: boolean
  analysisTime?: number
  debugInfo?: any
}
