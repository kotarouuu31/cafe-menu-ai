import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { convertMenuForFrontend, searchMenusByKeywords } from '@/lib/menu-utils'
import { createErrorResponse, withErrorHandler } from '@/lib/error-handler'

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

// 重複削除：convertMenuForFrontend は menu-utils.ts に移動

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const { keywords } = searchMenuSchema.parse(body)

  console.log('🔍 メニュー検索開始:', keywords)

  // Supabaseのみを使用するため、フォールバックメニューから検索
  const matchedMenus = searchMenusByKeywords(FALLBACK_MENUS, keywords)

  console.log('✅ マッチしたメニュー数:', matchedMenus.length)

  return NextResponse.json({ 
    menus: matchedMenus,
    searchKeywords: keywords,
    totalMatches: matchedMenus.length
  })
}, 'メニュー検索に失敗しました')
