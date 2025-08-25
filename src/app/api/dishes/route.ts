import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withErrorHandler } from '@/lib/error-handler'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleGetDishes(req: NextRequest) {
  try {
    console.log('📋 料理一覧を取得中...')

    const { data: dishes, error } = await supabaseAdmin
      .from('dishes')
      .select(`
        id,
        notion_id,
        name,
        name_en,
        category,
        price,
        description,
        keywords,
        visual_keywords,
        image_urls,
        available,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('料理一覧取得エラー:', error)
      throw error
    }

    console.log(`✅ ${dishes?.length || 0}件の料理を取得`)

    return NextResponse.json({
      success: true,
      dishes: dishes || [],
      count: dishes?.length || 0
    })

  } catch (error) {
    console.error('料理一覧取得エラー:', error)
    return NextResponse.json(
      { error: '料理一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

export const GET = withErrorHandler(handleGetDishes)
