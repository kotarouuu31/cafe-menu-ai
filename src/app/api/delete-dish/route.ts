import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler } from '@/lib/error-handler'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NOTION_TOKEN = process.env.NOTION_TOKEN!

async function handleDeleteDish(req: NextRequest) {
  const { notionId, dishName } = await req.json()

  if (!notionId) {
    return NextResponse.json(
      { error: 'Notion IDが必要です' },
      { status: 400 }
    )
  }

  try {
    console.log(`🗑️ 料理削除開始: ${dishName || notionId}`)

    // 1. Supabaseから削除
    const { error: supabaseError } = await supabaseAdmin
      .from('dishes')
      .delete()
      .eq('notion_id', notionId)

    if (supabaseError) {
      console.error('Supabase削除エラー:', supabaseError)
      throw new Error(`Supabase削除失敗: ${supabaseError.message}`)
    }

    console.log('✅ Supabaseから削除完了')

    // 2. Notionから削除（アーカイブ）
    try {
      const notionResponse = await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          archived: true
        })
      })

      if (!notionResponse.ok) {
        const errorData = await notionResponse.json()
        console.warn('Notion削除警告:', errorData)
        // Notionエラーでも処理続行（Supabaseは既に削除済み）
      } else {
        console.log('✅ Notionからアーカイブ完了')
      }
    } catch (notionError) {
      console.warn('Notion削除警告:', notionError)
      // Notionエラーでも処理続行
    }

    return NextResponse.json({
      success: true,
      message: `${dishName || '料理'}を削除しました`,
      deleted_from: ['supabase', 'notion'],
      notion_id: notionId
    })

  } catch (error) {
    console.error('料理削除エラー:', error)
    return NextResponse.json(
      { 
        error: '料理削除に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

export const DELETE = withErrorHandler(handleDeleteDish)
export const POST = withErrorHandler(handleDeleteDish) // POST でも対応
