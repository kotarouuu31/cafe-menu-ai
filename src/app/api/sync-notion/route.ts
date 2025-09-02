import { NextResponse } from 'next/server'
import { notion, DISHES_DATABASE_ID, NotionDishProperties } from '@/lib/notion'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST() {
  try {
    // 環境変数チェック
    if (!process.env.NOTION_TOKEN || process.env.NOTION_TOKEN === 'placeholder-token') {
      return NextResponse.json({ 
        error: 'Notion環境変数が設定されていません',
        success: false 
      }, { status: 400 })
    }

    if (!process.env.NOTION_DISHES_DATABASE_ID || process.env.NOTION_DISHES_DATABASE_ID === 'placeholder-database-id') {
      return NextResponse.json({ 
        error: 'NotionデータベースIDが設定されていません',
        success: false 
      }, { status: 400 })
    }

    console.log('🔄 Notion同期開始')
    console.log('📋 データベースID:', DISHES_DATABASE_ID)

    const response = await notion.databases.query({
      database_id: DISHES_DATABASE_ID,
    })

    let syncCount = 0

    for (const page of response.results) {
      if ('properties' in page) {
        const props = page.properties as unknown as NotionDishProperties

        // Notionデータを解析
        const dishData = {
          notion_id: page.id,
          name: props.Name?.title?.[0]?.text?.content || '',
          name_en: props.NameEn?.rich_text?.[0]?.text?.content || null,
          description: props.Description?.rich_text?.[0]?.text?.content || null,
          price: props.Price?.number || null,
          category: props.Category?.select?.name || '',
          chef_comment: props.ChefComment?.rich_text?.[0]?.text?.content || null,
          recommendation: props.Recommendation?.rich_text?.[0]?.text?.content || null,
          pairing_suggestion: props.PairingSuggestion?.rich_text?.[0]?.text?.content || null,
          ingredients: props.Ingredients?.multi_select?.map(item => item.name) || [],
          allergens: props.Allergens?.multi_select?.map(item => item.name) || [],
          keywords: props.Keywords?.multi_select?.map(item => item.name) || [],
          available: props.Available?.checkbox || true,
          seasonal: props.Seasonal?.checkbox || false,
          popular: props.Popular?.checkbox || false,
          nutritional_info: {
            calories: props.Calories?.number || null
          },
          image_urls: [] // 後で画像URL処理を追加
        }

        // Supabaseに同期
        const { error } = await supabaseAdmin
          .from('dishes')
          .upsert(dishData, {
            onConflict: 'notion_id'
          })

        if (error) {
          console.error('Upsert error:', error)
        } else {
          syncCount++
        }
      }
    }

    console.log(`✅ ${syncCount}件の料理を同期しました`)
    return NextResponse.json({ 
      success: true, 
      syncCount,
      message: `${syncCount}件の料理を同期しました` 
    })

  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ 
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
