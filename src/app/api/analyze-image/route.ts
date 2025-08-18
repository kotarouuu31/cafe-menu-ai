import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ImageAnalysisResult } from '@/types/menu'

// 改善されたモック画像解析：より多様で現実的な結果
function mockImageAnalysis(): { detectedItems: string[]; confidence: number } {
  const analysisPatterns = [
    // コーヒー系
    {
      keywords: ['コーヒー', 'coffee', 'ドリンク', '黒い', '液体'],
      confidence: 0.85
    },
    // ケーキ系
    {
      keywords: ['ケーキ', 'cake', 'デザート', '甘い', '白い'],
      confidence: 0.8
    },
    // サンドイッチ系
    {
      keywords: ['サンドイッチ', 'sandwich', 'パン', '軽食', '四角い'],
      confidence: 0.75
    },
    // サラダ系
    {
      keywords: ['サラダ', 'salad', '野菜', '緑の', 'ヘルシー'],
      confidence: 0.7
    },
    // パンケーキ系
    {
      keywords: ['パンケーキ', 'pancake', 'フルーツ', '丸い', '重なった'],
      confidence: 0.8
    },
    // カプチーノ系
    {
      keywords: ['カプチーノ', 'cappuccino', 'ミルク', '泡', 'クリーミー'],
      confidence: 0.82
    },
    // 一般的な食べ物
    {
      keywords: ['food', '食べ物', 'dish', '料理'],
      confidence: 0.6
    }
  ]
  
  const randomIndex = Math.floor(Math.random() * analysisPatterns.length)
  const selected = analysisPatterns[randomIndex]
  
  console.log(`🎲 モック解析: ${selected.keywords.join(', ')} (信頼度: ${selected.confidence})`)
  
  return {
    detectedItems: selected.keywords,
    confidence: selected.confidence
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
        console.log('🚀 Google Vision API 実行中...')
        
        const { ImageAnnotatorClient } = await import('@google-cloud/vision')
        
        // 環境変数の詳細チェック
        console.log('🔧 Vision API環境変数チェック:')
        console.log('- PROJECT_ID:', !!process.env.GOOGLE_CLOUD_PROJECT_ID)
        console.log('- CLIENT_EMAIL:', !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL)
        console.log('- PRIVATE_KEY 長さ:', process.env.GOOGLE_CLOUD_PRIVATE_KEY?.length || 0)

        if (!process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
          throw new Error('GOOGLE_CLOUD_PRIVATE_KEY is missing')
        }

        const client = new ImageAnnotatorClient({
          projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
          credentials: {
            client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
          },
        })

        console.log('✅ Vision API クライアント初期化成功')

        // Base64データから画像を解析
        const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64')
        console.log('📷 画像バッファサイズ:', imageBuffer.length, 'bytes')
        
        const [result] = await client.labelDetection({
          image: { content: imageBuffer },
        })
        
        console.log('🎯 Vision API生レスポンス:', result)
        
        const labels = result.labelAnnotations
        if (labels && labels.length > 0) {
          detectedItems = labels.map((label: any) => label.description)
          confidence = labels[0]?.score || 0.7
          usingVisionAPI = true
          
          console.log('🔍 Google Vision API検出成功:', detectedItems)
          console.log('🎯 信頼度:', confidence)
        } else {
          console.warn('⚠️ Vision API: ラベルが検出されませんでした')
          throw new Error('No labels detected')
        }
        
      } catch (visionError: any) {
        console.error('❌ Vision API エラー詳細:', {
          name: visionError.name,
          message: visionError.message,
          stack: visionError.stack,
          code: visionError.code
        })
        
        // フォールバックでモックデータを使用
        const mockResult = mockImageAnalysis()
        detectedItems = mockResult.detectedItems
        confidence = mockResult.confidence
        console.log('🔄 モックデータにフォールバック:', detectedItems)
      }
    } else {
      console.log('⚠️ Vision API環境変数が未設定:', {
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasClientEmail: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY
      })
      
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
      if (detectedItems.length > 0) {
        console.log(`🔍 検索キーワード: ${detectedItems.join(', ')}`)
        
        // より柔軟な検索クエリ
        const searchQueries = detectedItems.map(item => 
          `keywords.cs.["${item}"],visual_keywords.cs.["${item}"],name.ilike.%${item}%,description.ilike.%${item}%`
        )
        
        const result = await supabaseAdmin
          .from('dishes')
          .select('*')
          .eq('available', true)
          .or(searchQueries.join(','))
          .limit(5)
        data = result.data
        error = result.error
        
        console.log(`📊 検索結果: ${data?.length || 0}件`)
        
        // 検索結果が少ない場合は、ランダム選択でフォールバック
        if (!data || data.length === 0) {
          console.log('🎲 ランダム選択にフォールバック')
          const randomResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
          
          if (randomResult.data && randomResult.data.length > 0) {
            const shuffled = randomResult.data.sort(() => Math.random() - 0.5)
            data = shuffled.slice(0, 3)
            console.log('🎲 ランダム結果:', data.map(d => d.name))
          }
        }
      } else {
        // キーワードがない場合は人気順で取得
        console.log('📋 キーワードなし、人気料理を取得します')
        const result = await supabaseAdmin
          .from('dishes')
          .select('*')
          .eq('available', true)
          .eq('popular', true)
          .limit(3)
        data = result.data
        error = result.error
      }

      if (error) {
        console.error('❌ Supabase検索エラー:', error)
        suggestedDishes = []
      } else {
        suggestedDishes = data || []
        console.log(`✅ ${suggestedDishes.length}件の料理が見つかりました`)
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