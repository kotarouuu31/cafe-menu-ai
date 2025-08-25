import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler } from '@/lib/error-handler'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const NOTION_TOKEN = process.env.NOTION_TOKEN!

async function handleDeleteDish(req: NextRequest) {
  const { dishId, notionId } = await req.json()

  if (!dishId && !notionId) {
    return NextResponse.json(
      { error: 'dishId または notionId が必要です' },
      { status: 400 }
    )
  }

  try {
    console.log('🗑️ 料理削除を開始...', { dishId, notionId })

    let deletedFromSupabase = false
    let deletedFromNotion = false
    let dishName = 'unknown'

    // Supabaseから削除
    if (dishId) {
      // 削除前に料理名を取得
      const { data: dishData } = await supabaseAdmin
        .from('dishes')
        .select('name, notion_id')
        .eq('id', dishId)
        .single()

      if (dishData) {
        dishName = dishData.name
        const actualNotionId = notionId || dishData.notion_id

        // Supabaseから削除
        const { error: supabaseError } = await supabaseAdmin
          .from('dishes')
          .delete()
          .eq('id', dishId)

        if (supabaseError) {
          console.error('Supabase削除エラー:', supabaseError)
        } else {
          deletedFromSupabase = true
          console.log('✅ Supabaseから削除完了')
        }

        // Notionからも削除
        if (actualNotionId) {
          try {
            const notionResponse = await fetch(`https://api.notion.com/v1/pages/${actualNotionId}`, {
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

            if (notionResponse.ok) {
              deletedFromNotion = true
              console.log('✅ Notionから削除完了')
            } else {
              console.error('Notion削除エラー:', notionResponse.status)
            }
          } catch (notionError) {
            console.error('Notion削除エラー:', notionError)
          }
        }
      }
    }
    // NotionIDのみが提供された場合
    else if (notionId) {
      // Supabaseから該当料理を検索して削除
      const { data: dishData } = await supabaseAdmin
        .from('dishes')
        .select('name, id')
        .eq('notion_id', notionId)
        .single()

      if (dishData) {
        dishName = dishData.name

        // Supabaseから削除
        const { error: supabaseError } = await supabaseAdmin
          .from('dishes')
          .delete()
          .eq('notion_id', notionId)

        if (!supabaseError) {
          deletedFromSupabase = true
          console.log('✅ Supabaseから削除完了')
        }
      }

      // Notionから削除
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

        if (notionResponse.ok) {
          deletedFromNotion = true
          console.log('✅ Notionから削除完了')
        }
      } catch (notionError) {
        console.error('Notion削除エラー:', notionError)
      }
    }

    const success = deletedFromSupabase || deletedFromNotion

    return NextResponse.json({
      success,
      message: success ? `${dishName} を削除しました` : '削除に失敗しました',
      deleted_from_supabase: deletedFromSupabase,
      deleted_from_notion: deletedFromNotion,
      dish_name: dishName
    })

  } catch (error) {
    console.error('料理削除エラー:', error)
    return NextResponse.json(
      { error: '料理削除に失敗しました' },
      { status: 500 }
    )
  }
}

export const DELETE = withErrorHandler(handleDeleteDish)
