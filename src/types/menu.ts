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

export interface ImageAnalysisResult {
  detectedItems: string[];
  confidence: number;
  suggestedMenus: Menu[];
  analysisTime?: string;
  usingVisionAPI?: boolean;
}
