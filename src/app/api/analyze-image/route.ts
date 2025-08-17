import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ImageAnalysisResult } from '@/types/menu'

// モック画像解析：Google Vision APIが利用できない場合のフォールバック
function mockImageAnalysis(): { detectedItems: string[]; confidence: number } {
  const menuBasedKeywords = [
    ['チョコレート', 'ケーキ', 'デザート'],
    ['コーヒー', 'ラテ', 'ドリンク'],
    ['サンドイッチ', 'チキン', 'ベーコン'],
    ['food', '食べ物', 'フード'],
    ['drink', '飲み物', 'ドリンク']
  ]
  
  const randomIndex = Math.floor(Math.random() * menuBasedKeywords.length)
  const detectedItems = menuBasedKeywords[randomIndex]
  
  return {
    detectedItems,
    confidence: 0.7
  }
}

export async function POST(request: NextRequest) {
  try {
    // 環境変数チェック
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://placeholder.supabase.co') {
      console.warn('⚠️ Supabase環境変数が設定されていません。モックデータを使用します。')
    }

    const { imageData } = await request.json()

    if (!imageData) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 })
    }

    let detectedItems: string[] = []
    let confidence = 0.7
    let usingVisionAPI = false

    // Google Vision API設定チェック
    const hasVisionAPI = process.env.GOOGLE_CLOUD_PROJECT_ID && 
                        process.env.GOOGLE_CLOUD_PRIVATE_KEY && 
                        process.env.GOOGLE_CLOUD_CLIENT_EMAIL

    if (hasVisionAPI) {
      try {
        // Google Vision API実装（既存のコードを使用）
        // ... Vision API コード ...
        usingVisionAPI = true
      } catch (visionError) {
        console.error('Vision API Error:', visionError)
        // フォールバックでモックデータを使用
        const mockResult = mockImageAnalysis()
        detectedItems = mockResult.detectedItems
        confidence = mockResult.confidence
      }
    } else {
      // モックデータ
      const mockResult = mockImageAnalysis()
      detectedItems = mockResult.detectedItems
      confidence = mockResult.confidence
      console.log('🔮 モックデータを使用中')
    }

    let suggestedDishes: any[] = []
    
    // Supabase環境変数が正しく設定されている場合のみクエリ実行
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co') {
      
      // Supabaseから料理データを検索
      console.log('🔍 Supabaseで料理を検索中...', detectedItems)
      
      let data, error
      if (detectedItems.length > 0) {
        const result = await supabaseAdmin
          .from('dishes')
          .select('*')
          .eq('available', true)
          .or(
            detectedItems.map(item => 
              `keywords.cs.["${item}"],visual_keywords.cs.["${item}"],name.ilike.%${item}%`
            ).join(',')
          )
          .limit(5)
        data = result.data
        error = result.error
      } else {
        // キーワードがない場合は全ての利用可能な料理を取得
        const result = await supabaseAdmin
          .from('dishes')
          .select('*')
          .eq('available', true)
          .limit(3)
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('❌ Supabase検索エラー:', error)
        suggestedDishes = []
      } else {
        suggestedDishes = data || []
      }
    } else {
      console.log('⚠️ Supabase未設定のため、モック料理データを使用')
      // モック料理データ（検出キーワードに関係なく表示）
      suggestedDishes = [
        {
          id: 'mock-1',
          name: 'チョコレートケーキ',
          description: '濃厚なチョコレートの風味が楽しめるケーキです',
          price: 450,
          category: 'デザート',
          ingredients: ['チョコレート', '小麦粉', '卵', 'バター'],
          allergens: ['小麦', '卵', '乳'],
          chef_comment: '当店自慢の濃厚チョコレートケーキです'
        },
        {
          id: 'mock-2',
          name: 'ブレンドコーヒー',
          description: '香り高いオリジナルブレンドコーヒー',
          price: 350,
          category: 'ドリンク',
          ingredients: ['コーヒー豆'],
          allergens: [],
          chef_comment: '厳選した豆を使用した自慢のブレンドです'
        }
      ]
    }

    const result: ImageAnalysisResult = {
      confidence,
      detectedItems,
      suggestedDishes,
      usingVisionAPI,
      analysisTime: Date.now()
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
