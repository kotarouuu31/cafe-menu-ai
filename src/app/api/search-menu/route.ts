import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { Menu, MenuDB } from '@/types/menu'

const searchMenuSchema = z.object({
  keywords: z.array(z.string()).min(1, 'キーワードは必須です'),
})

// データベースからのデータを配列形式に変換
function convertDbToMenu(dbMenu: MenuDB): Menu {
  return {
    ...dbMenu,
    ingredients: JSON.parse(dbMenu.ingredients || '[]'),
    allergens: JSON.parse(dbMenu.allergens || '[]'),
    keywords: JSON.parse(dbMenu.keywords || '[]'),
    imageUrls: JSON.parse(dbMenu.imageUrls || '[]'),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { keywords } = searchMenuSchema.parse(body)
    
    // キーワードに基づいてメニューを検索（SQLite対応）
    const dbMenus = await prisma.menu.findMany({
      where: {
        active: true,
        OR: [
          // メニュー名での部分一致検索
          {
            name: {
              contains: keywords.join(' '),
            },
          },
          // 説明での部分一致検索
          {
            description: {
              contains: keywords.join(' '),
            },
          },
          // 各キーワードでの個別検索
          ...keywords.map(keyword => ({
            OR: [
              {
                name: {
                  contains: keyword,
                },
              },
              {
                description: {
                  contains: keyword,
                },
              },
              {
                keywords: {
                  contains: keyword,
                },
              },
              {
                ingredients: {
                  contains: keyword,
                },
              },
              {
                category: {
                  contains: keyword,
                },
              },
            ],
          })),
        ],
      },
      orderBy: { createdAt: 'desc' },
    }) as MenuDB[]
    
    const menus = dbMenus.map(convertDbToMenu)
    
    // 関連度スコアを計算（簡易版）
    const menusWithScore = menus.map(menu => {
      let score = 0
      const allText = [
        menu.name,
        menu.description,
        menu.category,
        ...menu.keywords,
        ...menu.ingredients,
      ].join(' ').toLowerCase()
      
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase()
        // 完全一致は高スコア
        if (allText.includes(keywordLower)) {
          score += 10
        }
        // 部分一致は低スコア
        if (allText.includes(keywordLower.substring(0, 3))) {
          score += 3
        }
      })
      
      return { ...menu, score }
    })
    
    // スコア順でソート
    const sortedMenus = menusWithScore
      .filter(menu => menu.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ score, ...menu }) => menu) // スコアを除去
    
    return NextResponse.json({
      menus: sortedMenus,
      total: sortedMenus.length,
      keywords,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
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
