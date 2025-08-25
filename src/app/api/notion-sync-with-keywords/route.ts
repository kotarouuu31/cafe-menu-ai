import { NextRequest, NextResponse } from 'next/server'
import { AutoKeywordGenerator } from '@/lib/keyword-generator'
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler } from '@/lib/error-handler'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NOTION_TOKEN = process.env.NOTION_TOKEN!
const NOTION_DISHES_DATABASE_ID = process.env.NOTION_DISHES_DATABASE_ID!

async function handleNotionSyncWithKeywords(req: NextRequest) {
  const { dishId, generateKeywords = true } = await req.json()

  try {
    console.log('🔄 Notion同期（キーワード自動生成付き）を開始...')

    // Notionから料理データを取得
    const notionResponse = await fetch(`https://api.notion.com/v1/databases/${NOTION_DISHES_DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: dishId ? {
          property: 'id',
          rich_text: { equals: dishId }
        } : undefined
      })
    })

    if (!notionResponse.ok) {
      throw new Error(`Notion API エラー: ${notionResponse.status}`)
    }

    const notionData = await notionResponse.json()
    const dishes = notionData.results

    if (!dishes || dishes.length === 0) {
      return NextResponse.json({ error: '料理データが見つかりません' }, { status: 404 })
    }

    const generator = new AutoKeywordGenerator()
    const results = []

    for (const dish of dishes) {
      try {
        // Notionデータを解析
        const dishData = await parseNotionDish(dish)
        
        let keywords = dishData.keywords || []
        let visual_keywords = dishData.visual_keywords || []

        // キーワード自動生成が有効な場合
        if (generateKeywords && dishData.image_url) {
          console.log(`🤖 ${dishData.name} のキーワードを自動生成中...`)
          
          try {
            // 画像をダウンロード
            const imageResponse = await fetch(dishData.image_url)
            if (imageResponse.ok) {
              const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
              
              // キーワード自動生成
              const generatedKeywords = await generator.generateKeywords(
                imageBuffer,
                dishData.name,
                dishData.category
              )
              
              keywords = generatedKeywords.keywords
              visual_keywords = generatedKeywords.visual_keywords
              
              console.log(`✅ ${dishData.name} キーワード生成完了:`, {
                keywords: keywords.slice(0, 5),
                visual_keywords: visual_keywords.slice(0, 3),
                confidence: generatedKeywords.confidence
              })
            }
          } catch (keywordError) {
            console.warn(`⚠️ ${dishData.name} キーワード生成失敗:`, keywordError)
            // フォールバック: 料理名とカテゴリベースのキーワード
            keywords = [dishData.name, dishData.category, '料理', 'food']
            visual_keywords = ['美味しそう', '食べ物']
          }
        }

        // Supabaseにupsert
        const { data, error } = await supabaseAdmin
          .from('dishes')
          .upsert({
            notion_id: dish.id,
            name: dishData.name,
            name_en: dishData.name_en,
            description: dishData.description,
            price: dishData.price,
            category: dishData.category,
            chef_comment: dishData.chef_comment,
            recommendation: dishData.recommendation,
            pairing_suggestion: dishData.pairing_suggestion,
            ingredients: dishData.ingredients,
            allergens: dishData.allergens,
            nutritional_info: dishData.nutritional_info,
            keywords: keywords,
            visual_keywords: visual_keywords,
            image_urls: dishData.image_urls,
            available: dishData.available,
            seasonal: dishData.seasonal,
            popular: dishData.popular,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'notion_id'
          })

        if (error) {
          console.error(`❌ ${dishData.name} Supabase更新エラー:`, error)
          results.push({
            dish: dishData.name,
            status: 'error',
            error: error.message
          })
        } else {
          console.log(`✅ ${dishData.name} 同期完了`)
          results.push({
            dish: dishData.name,
            status: 'success',
            keywords_generated: generateKeywords,
            keywords_count: keywords.length,
            visual_keywords_count: visual_keywords.length
          })
        }

      } catch (dishError) {
        console.error('料理処理エラー:', dishError)
        results.push({
          dish: 'unknown',
          status: 'error',
          error: dishError instanceof Error ? dishError.message : '不明なエラー'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `${results.length}件の料理を同期しました`,
      keywords_auto_generated: generateKeywords,
      results
    })

  } catch (error) {
    console.error('Notion同期エラー:', error)
    return NextResponse.json(
      { error: 'Notion同期に失敗しました' },
      { status: 500 }
    )
  }
}

async function parseNotionDish(dish: any) {
  const properties = dish.properties

  return {
    name: properties.Name?.title?.[0]?.text?.content || '',
    name_en: properties.NameEn?.rich_text?.[0]?.text?.content || '',
    description: properties.Description?.rich_text?.[0]?.text?.content || '',
    price: properties.Price?.number || 0,
    category: properties.Category?.select?.name || '',
    chef_comment: properties.ChefComment?.rich_text?.[0]?.text?.content || '',
    recommendation: properties.Recommendation?.rich_text?.[0]?.text?.content || '',
    pairing_suggestion: properties.PairingSuggestion?.rich_text?.[0]?.text?.content || '',
    ingredients: properties.Ingredients?.multi_select?.map((item: any) => item.name) || [],
    allergens: properties.Allergens?.multi_select?.map((item: any) => item.name) || [],
    nutritional_info: { calories: properties.Calories?.number || 0 },
    keywords: properties.Keywords?.multi_select?.map((item: any) => item.name) || [],
    visual_keywords: properties.VisualKeywords?.multi_select?.map((item: any) => item.name) || [],
    image_urls: properties.Images?.files?.map((file: any) => 
      file.type === 'external' ? file.external.url : file.file.url
    ) || [],
    image_url: properties.Images?.files?.[0]?.type === 'external' 
      ? properties.Images.files[0].external.url 
      : properties.Images?.files?.[0]?.file?.url,
    available: properties.Available?.checkbox ?? true,
    seasonal: properties.Seasonal?.checkbox ?? false,
    popular: properties.Popular?.checkbox ?? false
  }
}

export const POST = withErrorHandler(handleNotionSyncWithKeywords)
