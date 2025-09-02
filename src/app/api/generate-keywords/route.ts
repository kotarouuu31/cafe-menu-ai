import { NextRequest, NextResponse } from 'next/server'
import { AutoKeywordGenerator } from '@/lib/keyword-generator'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function handleGenerateKeywords(req: NextRequest) {
  const { dishId, imageData, dishName, category } = await req.json()

  if (!imageData || !dishName || !category) {
    return NextResponse.json(
      { error: '必要なパラメータが不足しています' },
      { status: 400 }
    )
  }

  try {
    const generator = new AutoKeywordGenerator()
    
    // Base64画像をBufferに変換
    const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64')
    
    // キーワード自動生成
    const result = await generator.generateKeywords(imageBuffer, dishName, category)
    
    console.log('🤖 自動生成されたキーワード:', result)

    // dishIdが指定されている場合は、データベースを更新
    if (dishId) {
      const { error: updateError } = await supabaseAdmin
        .from('dishes')
        .update({
          keywords: result.keywords,
          updated_at: new Date().toISOString()
        })
        .eq('id', dishId)

      if (updateError) {
        console.error('データベース更新エラー:', updateError)
        return NextResponse.json(
          { error: 'データベース更新に失敗しました' },
          { status: 500 }
        )
      }

      console.log(`✅ 料理ID ${dishId} のキーワードを更新しました`)
    }

    return NextResponse.json({
      success: true,
      keywords: result.keywords,
      confidence: result.confidence,
      message: dishId ? 'キーワードを生成し、データベースを更新しました' : 'キーワードを生成しました'
    })

  } catch (error) {
    console.error('キーワード生成エラー:', error)
    return NextResponse.json(
      { error: 'キーワード生成に失敗しました' },
      { status: 500 }
    )
  }
}

export const POST = handleGenerateKeywords
