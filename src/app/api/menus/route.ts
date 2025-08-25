import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { convertMenuForFrontend } from '@/lib/menu-utils'
import { createErrorResponse, withErrorHandler } from '@/lib/error-handler'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const createMenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  ingredients: z.array(z.string()).transform(arr => JSON.stringify(arr)),
  allergens: z.array(z.string()).transform(arr => JSON.stringify(arr)),
  keywords: z.array(z.string()).transform(arr => JSON.stringify(arr)),
  imageUrls: z.array(z.string()).optional().default([]).transform(arr => JSON.stringify(arr)),
  price: z.number().optional().nullable(),
  category: z.string().min(1),
})

// サンプルメニューデータ（Prismaが使えない場合のフォールバック）
const fallbackMenus = [
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

export const GET = withErrorHandler(async () => {
  try {
    // Supabaseから料理データを取得
    const { data: dishes, error } = await supabaseAdmin
      .from('dishes')
      .select('*')
      .eq('available', true)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Supabase取得エラー:', error)
      // エラー時はフォールバックデータを返す
      return NextResponse.json({ 
        success: true,
        menus: fallbackMenus,
        source: 'fallback'
      })
    }

    // データが存在しない場合もフォールバック
    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ 
        success: true,
        menus: fallbackMenus,
        source: 'fallback'
      })
    }

    // Supabaseデータを返す
    return NextResponse.json({ 
      success: true,
      menus: dishes,
      source: 'supabase'
    })

  } catch (error) {
    console.error('メニュー取得エラー:', error)
    // エラー時はフォールバックデータを返す
    return NextResponse.json({ 
      success: true,
      menus: fallbackMenus,
      source: 'fallback'
    })
  }
}, 'メニュー取得に失敗しました')

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json()
  const validatedData = createMenuSchema.parse(body)

  // Supabaseのみを使用するため、フォールバック作成
  const newMenu = {
    id: Math.random().toString(),
    ...validatedData,
    price: validatedData.price ?? null,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  return NextResponse.json(newMenu, { status: 201 })
}, 'メニュー作成に失敗しました')
