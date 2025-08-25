import { NextRequest, NextResponse } from 'next/server'
import { AutoKeywordGenerator } from '@/lib/keyword-generator'
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler } from '@/lib/error-handler'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleBulkUpdateKeywords(req: NextRequest) {
  const { dryRun = false } = await req.json()

  try {
    const generator = new AutoKeywordGenerator()
    
    // 全料理データを取得
    const { data: dishes, error } = await supabaseAdmin
      .from('dishes')
      .select('id, name, category, image_urls')
      .eq('available', true)

    if (error) {
      return NextResponse.json({ error: 'データ取得エラー' }, { status: 500 })
    }

    const results = []
    let successCount = 0
    let errorCount = 0

    console.log(`🚀 ${dishes?.length || 0}件の料理のキーワード更新を開始...`)

    for (const dish of dishes || []) {
      try {
        // 料理名とカテゴリからキーワードを生成（画像なしでも動作）
        const fallbackResult = await generator.generateKeywords(
          Buffer.alloc(0), // 空のBuffer（フォールバック用）
          dish.name,
          dish.category
        )

        const updateData = {
          keywords: fallbackResult.keywords,
          visual_keywords: fallbackResult.visual_keywords,
          updated_at: new Date().toISOString()
        }

        if (!dryRun) {
          const { error: updateError } = await supabaseAdmin
            .from('dishes')
            .update(updateData)
            .eq('id', dish.id)

          if (updateError) {
            console.error(`❌ ${dish.name} 更新エラー:`, updateError)
            errorCount++
            continue
          }
        }

        results.push({
          dishId: dish.id,
          dishName: dish.name,
          category: dish.category,
          keywords: updateData.keywords,
          visual_keywords: updateData.visual_keywords,
          status: 'success'
        })

        successCount++
        console.log(`✅ ${dish.name} のキーワードを${dryRun ? '生成' : '更新'}しました`)

      } catch (dishError) {
        console.error(`❌ ${dish.name} 処理エラー:`, dishError)
        errorCount++
        results.push({
          dishId: dish.id,
          dishName: dish.name,
          status: 'error',
          error: dishError instanceof Error ? dishError.message : '不明なエラー'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `キーワード${dryRun ? '生成' : '更新'}完了`,
      summary: {
        total: dishes?.length || 0,
        success: successCount,
        errors: errorCount,
        dryRun
      },
      results
    })

  } catch (error) {
    console.error('一括更新エラー:', error)
    return NextResponse.json(
      { error: '一括更新に失敗しました' },
      { status: 500 }
    )
  }
}

export const POST = withErrorHandler(handleBulkUpdateKeywords)
