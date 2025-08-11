import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const analyzeImageSchema = z.object({
  imageData: z.string().min(1, '画像データは必須です'), // Base64 encoded image data
})

// モック画像解析：ランダムなキーワードを返す
function mockImageAnalysis(): { detectedItems: string[]; confidence: number } {
  const possibleItems = [
    // 日本語キーワード
    ['チョコレート', 'ケーキ', 'デザート'],
    ['コーヒー', 'ラテ', 'ドリンク'],
    ['サンドイッチ', 'パン', 'フード'],
    ['チキン', 'ベーコン', 'サンドイッチ'],
    ['ミルク', 'コーヒー', 'ラテ'],
    // 英語キーワード
    ['chocolate', 'cake', 'dessert'],
    ['coffee', 'latte', 'drink'],
    ['sandwich', 'bread', 'food'],
    ['chicken', 'bacon', 'sandwich'],
    ['milk', 'coffee', 'latte'],
  ]
  
  // ランダムにキーワードセットを選択
  const randomIndex = Math.floor(Math.random() * possibleItems.length)
  const detectedItems = possibleItems[randomIndex]
  
  // 信頼度もランダムに生成（0.7-0.95の範囲）
  const confidence = Math.random() * 0.25 + 0.7
  
  return {
    detectedItems,
    confidence: Math.round(confidence * 100) / 100,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = analyzeImageSchema.parse(body)
    
    // 画像解析処理をシミュレート（少し待機）
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // モック画像解析を実行
    const analysisResult = mockImageAnalysis()
    
    // メニュー検索APIを呼び出し
    const searchResponse = await fetch(`${request.nextUrl.origin}/api/search-menu`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: analysisResult.detectedItems,
      }),
    })
    
    let suggestedMenus = []
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json()
      suggestedMenus = searchResult.menus || []
    }
    
    const result = {
      detectedItems: analysisResult.detectedItems,
      confidence: analysisResult.confidence,
      suggestedMenus,
      analysisTime: new Date().toISOString(),
    }
    
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error analyzing image:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
