import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { safePrismaOperation } from '@/lib/prisma'

const searchMenuSchema = z.object({
  keywords: z.array(z.string()).min(1, 'キーワードは少なくとも1つ必要です'),
})

// フォールバックメニューデータ
const FALLBACK_MENUS = [
  {
    id: '1',
    name: 'ガトーショコラ',
    description: '濃厚なチョコレートケーキ',
    ingredients: ['チョコレート', '卵', 'バター', '砂糖', '小麦粉'],
    allergens: ['卵', '乳製品', '小麦'],
    keywords: ['chocolate', 'cake', 'dessert', 'チョコレート', 'ケーキ', 'デザート'],
    imageUrls: [],
    price: 520,
    category: 'デザート',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    name: 'カフェラテ',
    description: 'エスプレッソとスチームミルクの絶妙なバランス',
    ingredients: ['エスプレッソ', '牛乳'],
    allergens: ['乳製品'],
    keywords: ['coffee', 'latte', 'milk', 'コーヒー', 'ラテ', 'ミルク', 'ドリンク'],
    imageUrls: [],
    price: 450,
    category: 'ドリンク',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    name: 'クラブハウスサンドイッチ',
    description: 'チキン、ベーコン、レタス、トマトの贅沢サンドイッチ',
    ingredients: ['パン', 'チキン', 'ベーコン', 'レタス', 'トマト', 'マヨネーズ'],
    allergens: ['小麦', '卵', '大豆'],
    keywords: ['sandwich', 'chicken', 'bacon', 'bread', 'サンドイッチ', 'チキン', 'ベーコン', 'パン'],
    imageUrls: [],
    price: 780,
    category: 'フード',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

// DBデータをフロントエンド用に変換する関数
const convertMenuForFrontend = (menu: any) => ({
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
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywords } = searchMenuSchema.parse(body)

    console.log('🔍 メニュー検索開始:', keywords)

    const matchedMenus = await safePrismaOperation(
      async (prisma) => {
        const allMenus = await prisma.menu.findMany({
          where: { active: true },
        })

        const convertedMenus = allMenus.map(convertMenuForFrontend)
        
        return convertedMenus.filter((menu: any) => {
          const menuKeywords = menu.keywords.join(',').toLowerCase()
          return keywords.some(keyword => 
            menuKeywords.includes(keyword.toLowerCase())
          )
        })
      },
      // フォールバック検索
      FALLBACK_MENUS.filter(menu => {
        const menuKeywords = menu.keywords.join(',').toLowerCase()
        return keywords.some(keyword => 
          menuKeywords.includes(keyword.toLowerCase())
        )
      })
    )

    console.log('✅ マッチしたメニュー数:', matchedMenus.length)

    return NextResponse.json({ 
      menus: matchedMenus,
      searchKeywords: keywords,
      totalMatches: matchedMenus.length
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid search parameters', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error searching menus:', error)
    return NextResponse.json(
      { error: 'Failed to search menus' },
      { status: 500 }
    )
  }
}
