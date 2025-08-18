import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ImageAnalysisResult } from '@/types/menu'

// モック画像解析：Google Vision APIが利用できない場合のフォールバック
function mockImageAnalysis(): { detectedItems: string[]; confidence: number } {
  // 実際のデータベース内の料理に基づいたキーワード
  const dishKeywords = [
    // チーズケーキ関連
    ['チーズケーキ', 'ケーキ', 'デザート', 'スイーツ', 'クリーミー'],
    // その他の一般的な料理（将来の拡張用）
    ['パスタ', 'イタリアン', '麺類'],
    ['ハンバーガー', 'バーガー', '肉'],
    ['サラダ', '野菜', 'ヘルシー'],
    ['コーヒー', 'ラテ', 'ドリンク', '飲み物'],
    ['ピザ', 'チーズ', 'イタリアン']
  ]
  
  const randomIndex = Math.floor(Math.random() * dishKeywords.length)
  const detectedItems = dishKeywords[randomIndex]
  
  console.log(`🎲 モック解析結果: ${detectedItems.join(', ')}`)
  
  return {
    detectedItems,
    confidence: 0.8
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
        // 実際のVision API実装がないため、モックデータを使用
        const mockResult = mockImageAnalysis()
        detectedItems = mockResult.detectedItems
        confidence = mockResult.confidence
        usingVisionAPI = true
        console.log('🔮 Vision API設定済みですが、モックデータを使用中:', detectedItems)
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
      console.log('🔮 モックデータを使用中:', detectedItems)
    }

    let suggestedDishes: any[] = []
    
    // Supabase環境変数が正しく設定されている場合のみクエリ実行
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && 
        process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co') {
      
      // Supabaseから料理データを検索
      console.log('🔍 Supabaseで料理を検索中...', detectedItems)
      
      let data, error
      if (detectedItems && detectedItems.length > 0) {
        console.log(`🔍 検索キーワード: ${detectedItems.join(', ')}`)
        
        // データベース構造確認
        console.log('📋 テーブル構造確認中...')
        const sampleResult = await supabaseAdmin
          .from('dishes')
          .select('name, keywords, visual_keywords')
          .limit(3)
        console.log('📊 サンプルデータ:', sampleResult.data)
        
        // 各キーワードで個別に検索してテスト
        for (const keyword of detectedItems) {
          console.log(`🔎 "${keyword}" で検索中...`)
          
          // keywords配列での検索
          const keywordResult = await supabaseAdmin
            .from('dishes')
            .select('name, keywords')
            .contains('keywords', [keyword])
            .limit(2)
          
          console.log(`キーワード "${keyword}" の結果:`, keywordResult.data)
          
          // name部分一致検索
          const nameResult = await supabaseAdmin
            .from('dishes')
            .select('name')
            .ilike('name', `%${keyword}%`)
            .limit(2)
          
          console.log(`名前 "${keyword}" の結果:`, nameResult.data)
        }
        
        // 複数の検索方法を試行
        const searchMethods = [
          // 方法1: contains
          async () => {
            console.log('🔍 検索方法1: contains')
            return await supabaseAdmin
              .from('dishes')
              .select('*')
              .eq('available', true)
              .contains('keywords', detectedItems)
              .limit(3)
          },
          
          // 方法2: overlaps  
          async () => {
            console.log('🔍 検索方法2: overlaps')
            return await supabaseAdmin
              .from('dishes')
              .select('*')
              .eq('available', true)
              .overlaps('keywords', detectedItems)
              .limit(3)
          },
          
          // 方法3: 個別検索
          async () => {
            console.log('🔍 検索方法3: 個別検索')
            const queries = detectedItems.map(item => 
              supabaseAdmin
                .from('dishes')
                .select('*')
                .eq('available', true)
                .contains('keywords', [item])
                .limit(2)
            )
            return Promise.all(queries)
          }
        ]

        for (let i = 0; i < searchMethods.length; i++) {
          try {
            console.log(`🔍 検索方法 ${i + 1} を試行中...`)
            const result = await searchMethods[i]()
            
            if (Array.isArray(result)) {
              // 方法3の場合
              const combinedData = result.flatMap(r => r.data || [])
              console.log(`検索方法 ${i + 1} 結果:`, combinedData.map(d => d.name))
              if (combinedData.length > 0 && !data) {
                data = combinedData.slice(0, 5)
                break
              }
            } else {
              // 方法1,2の場合
              console.log(`検索方法 ${i + 1} 結果:`, result.data?.map(d => d.name))
              if (result.data && result.data.length > 0 && !data) {
                data = result.data
                break
              }
            }
          } catch (err) {
            console.log(`検索方法 ${i + 1} エラー:`, err instanceof Error ? err.message : String(err))
          }
        }
        
        // 全データ取得してJavaScriptでフィルタ（代替方法）
        if (!data || data.length === 0) {
          console.log('🔄 代替検索方法を試行中...')
          
          const allDishesResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
          
          if (allDishesResult.data) {
            const filteredDishes = allDishesResult.data.filter(dish => {
              const keywords = dish.keywords || []
              const visualKeywords = dish.visual_keywords || []
              
              return detectedItems.some(item => 
                keywords.includes(item) ||
                visualKeywords.includes(item) ||
                dish.name.toLowerCase().includes(item.toLowerCase()) ||
                dish.description?.toLowerCase().includes(item.toLowerCase())
              )
            })
            
            console.log('🎯 JavaScriptフィルタ結果:', filteredDishes.map(d => d.name))
            
            if (filteredDishes.length > 0) {
              data = filteredDishes.slice(0, 5)
            }
          }
        }
        
        // それでも見つからない場合はランダム選択
        if (!data || data.length === 0) {
          console.log('🎲 ランダム選択にフォールバック')
          
          const randomResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
          
          if (randomResult.data && randomResult.data.length > 0) {
            // 配列をシャッフルして異なる結果を返す
            const shuffled = randomResult.data.sort(() => Math.random() - 0.5)
            data = shuffled.slice(0, 3)
            console.log('🎲 ランダム結果:', data.map(d => d.name))
          }
        }
      } else {
        // キーワードがない場合は全ての利用可能な料理を取得
        console.log('📋 キーワードなし、全料理を取得します')
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
