import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { safePrismaOperation } from '@/lib/prisma'

const createMenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  ingredients: z.string(),
  allergens: z.string(),
  keywords: z.string(),
  imageUrls: z.string().optional().default(''),
  price: z.number().optional(),
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

export async function GET() {
  try {
    const menus = await safePrismaOperation(
      async (prisma) => {
        const dbMenus = await prisma.menu.findMany({
          where: { active: true },
          orderBy: { createdAt: 'desc' },
        })
        return dbMenus.map(convertMenuForFrontend)
      },
      fallbackMenus
    )

    return NextResponse.json({ menus })
  } catch (error) {
    console.error('Error fetching menus:', error)
    return NextResponse.json({ menus: fallbackMenus })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createMenuSchema.parse(body)

    const newMenu = await safePrismaOperation(
      async (prisma) => {
        return await prisma.menu.create({
          data: validatedData,
        })
      },
      {
        id: Math.random().toString(),
        ...validatedData,
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    )

    return NextResponse.json(newMenu, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Error creating menu:', error)
    return NextResponse.json(
      { error: 'Failed to create menu' },
      { status: 500 }
    )
  }
}
