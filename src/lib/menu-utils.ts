import { Menu, MenuDB } from '@/types/menu'

/**
 * データベース形式のメニューをフロントエンド用に変換
 */
export function convertMenuForFrontend(menu: MenuDB): Menu {
  return {
    ...menu,
    ingredients: typeof menu.ingredients === 'string' 
      ? JSON.parse(menu.ingredients || '[]')
      : menu.ingredients,
    allergens: typeof menu.allergens === 'string'
      ? JSON.parse(menu.allergens || '[]')
      : menu.allergens,
    keywords: typeof menu.keywords === 'string'
      ? JSON.parse(menu.keywords || '[]')
      : menu.keywords,
    imageUrls: typeof menu.imageUrls === 'string'
      ? JSON.parse(menu.imageUrls || '[]')
      : menu.imageUrls,
  }
}

/**
 * フロントエンド形式のメニューをデータベース用に変換
 */
export function convertMenuForDatabase(menu: Omit<Menu, 'id' | 'createdAt' | 'updatedAt'>): Omit<MenuDB, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    ...menu,
    ingredients: JSON.stringify(menu.ingredients),
    allergens: JSON.stringify(menu.allergens),
    keywords: JSON.stringify(menu.keywords),
    imageUrls: JSON.stringify(menu.imageUrls),
  }
}

/**
 * キーワードでメニューを検索
 */
export function searchMenusByKeywords(menus: Menu[], keywords: string[]): Menu[] {
  const searchTerms = keywords.map(k => k.toLowerCase())
  
  return menus.filter(menu => {
    const menuKeywords = menu.keywords.join(',').toLowerCase()
    const menuName = menu.name.toLowerCase()
    const menuDescription = menu.description.toLowerCase()
    const menuIngredients = menu.ingredients.join(',').toLowerCase()
    
    return searchTerms.some(term => 
      menuKeywords.includes(term) ||
      menuName.includes(term) ||
      menuDescription.includes(term) ||
      menuIngredients.includes(term)
    )
  })
}

/**
 * カテゴリ一覧を取得
 */
export const MENU_CATEGORIES = [
  'ドリンク',
  'フード', 
  'デザート',
  'サイド'
] as const

export type MenuCategory = typeof MENU_CATEGORIES[number]

/**
 * 価格フォーマット
 */
export function formatPrice(price?: number | null): string {
  if (price == null) return '価格未設定'
  return price.toLocaleString()
}
