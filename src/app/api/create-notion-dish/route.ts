import { NextRequest, NextResponse } from 'next/server'
import { withErrorHandler } from '@/lib/error-handler'

const NOTION_TOKEN = process.env.NOTION_TOKEN!
const NOTION_DISHES_DATABASE_ID = process.env.NOTION_DISHES_DATABASE_ID!

async function handleCreateNotionDish(req: NextRequest) {
  const { 
    name, 
    name_en, 
    price, 
    category, 
    description, 
    chef_comment, 
    recommendation, 
    pairing_suggestion, 
    ingredients, 
    allergens, 
    keywords, 
    calories,
    imageUrl 
  } = await req.json()

  if (!name || !category || !description) {
    return NextResponse.json(
      { error: '必須フィールドが不足しています' },
      { status: 400 }
    )
  }

  try {
    console.log('🍽️ Notionに新料理を作成中...', name)

    // Notion APIでページ作成
    const notionResponse = await fetch(`https://api.notion.com/v1/pages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: {
          database_id: NOTION_DISHES_DATABASE_ID
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: name
                }
              }
            ]
          },
          NameEn: {
            rich_text: [
              {
                text: {
                  content: name_en || ''
                }
              }
            ]
          },
          Price: {
            number: price || 0
          },
          Category: {
            select: {
              name: category
            }
          },
          Description: {
            rich_text: [
              {
                text: {
                  content: description
                }
              }
            ]
          },
          ChefComment: {
            rich_text: [
              {
                text: {
                  content: chef_comment || ''
                }
              }
            ]
          },
          Recommendation: {
            rich_text: [
              {
                text: {
                  content: recommendation || ''
                }
              }
            ]
          },
          PairingSuggestion: {
            rich_text: [
              {
                text: {
                  content: pairing_suggestion || ''
                }
              }
            ]
          },
          Ingredients: {
            multi_select: (ingredients || []).map((ingredient: string) => ({
              name: ingredient
            }))
          },
          Allergens: {
            multi_select: (allergens || []).map((allergen: string) => ({
              name: allergen
            }))
          },
          Keywords: {
            multi_select: (keywords || []).map((keyword: string) => ({
              name: keyword
            }))
          },
          Available: {
            checkbox: true
          },
          Seasonal: {
            checkbox: false
          },
          Popular: {
            checkbox: false
          },
          Calories: {
            number: calories || 0
          },
          // 画像は一旦スキップ（base64データが大きすぎるため）
          // 実装時は Cloudinary, AWS S3 等の外部画像URLを使用
        }
      })
    })

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json()
      console.error('Notion API エラー:', errorData)
      throw new Error(`Notion API エラー: ${notionResponse.status}`)
    }

    const createdPage = await notionResponse.json()
    console.log('✅ Notion料理作成完了:', createdPage.id)

    // Supabase同期を自動実行
    try {
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/notion-sync-with-keywords`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          dishId: createdPage.id,
          generateKeywords: false // キーワードは既に生成済み
        })
      })

      if (syncResponse.ok) {
        console.log('✅ Supabase同期完了')
      } else {
        console.warn('⚠️ Supabase同期に失敗しましたが、Notion作成は成功')
      }
    } catch (syncError) {
      console.warn('⚠️ Supabase同期エラー:', syncError)
    }

    return NextResponse.json({
      success: true,
      message: '新料理を作成しました',
      notion_id: createdPage.id,
      notion_url: createdPage.url,
      dish_name: name
    })

  } catch (error) {
    console.error('Notion料理作成エラー:', error)
    return NextResponse.json(
      { error: 'Notion料理作成に失敗しました' },
      { status: 500 }
    )
  }
}

export const POST = withErrorHandler(handleCreateNotionDish)
