import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ImageAnalysisResult } from '@/types/menu'

// 改善されたモック画像解析：画像データに基づく一貫性のある結果
function mockImageAnalysis(imageData: string): { detectedItems: string[]; confidence: number } {
  // 画像データのハッシュ値を使用して一貫性のある結果を生成
  const imageHash = imageData.slice(-10) // 最後の10文字を使用
  const hashSum = imageHash.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)
  
  const analysisPatterns = [
    // コーヒー系
    {
      keywords: ['coffee', 'drink', 'beverage'],
      confidence: 0.85
    },
    // ケーキ系
    {
      keywords: ['cake', 'dessert', 'sweet'],
      confidence: 0.8
    },
    // サンドイッチ系
    {
      keywords: ['sandwich', 'bread', 'food'],
      confidence: 0.75
    },
    // サラダ系
    {
      keywords: ['salad', 'vegetable', 'healthy'],
      confidence: 0.7
    },
    // パンケーキ系
    {
      keywords: ['pancake', 'breakfast', 'syrup'],
      confidence: 0.8
    },
    // 一般的な食べ物（低信頼度）
    {
      keywords: ['food', 'dish'],
      confidence: 0.4
    }
  ]
  
  const patternIndex = hashSum % analysisPatterns.length
  const selected = analysisPatterns[patternIndex]
  
  console.log(`🎲 モック解析 (一貫性): ${selected.keywords.join(', ')} (信頼度: ${selected.confidence})`)
  
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
        
        // 複数の検出方法を組み合わせて使用
        const [labelResult] = await client.labelDetection({
          image: { content: imageBuffer },
        })
        
        // オブジェクト検出とテキスト検出を安全に実行
        let objectResult: any = { localizedObjectAnnotations: [] }
        let textResult: any = { textAnnotations: [] }
        
        try {
          if (client.objectLocalization) {
            [objectResult] = await client.objectLocalization({
              image: { content: imageBuffer },
            })
          }
        } catch (objError) {
          console.warn('⚠️ オブジェクト検出をスキップ:', objError)
        }
        
        try {
          if (client.textDetection) {
            [textResult] = await client.textDetection({
              image: { content: imageBuffer },
            })
          }
        } catch (textError) {
          console.warn('⚠️ テキスト検出をスキップ:', textError)
        }
        
        console.log('🎯 Vision API生レスポンス:')
        console.log('  - Labels:', labelResult.labelAnnotations?.map((l: any) => `${l.description} (${l.score?.toFixed(2)})`))
        console.log('  - Objects:', objectResult.localizedObjectAnnotations?.map((o: any) => `${o.name} (${o.score?.toFixed(2)})`))
        console.log('  - Text:', textResult.textAnnotations?.[0]?.description?.substring(0, 100))
        
        // 検出されたアイテムを統合
        const allDetectedItems: string[] = []
        
        // ラベル検出結果（信頼度0.6以上）
        if (labelResult.labelAnnotations) {
          const relevantLabels = labelResult.labelAnnotations
            .filter((label: any) => (label.score || 0) >= 0.6)
            .map((label: any) => label.description)
          allDetectedItems.push(...relevantLabels)
        }
        
        // オブジェクト検出結果（信頼度0.5以上）
        if (objectResult.localizedObjectAnnotations) {
          const relevantObjects = objectResult.localizedObjectAnnotations
            .filter((obj: any) => (obj.score || 0) >= 0.5)
            .map((obj: any) => obj.name)
          allDetectedItems.push(...relevantObjects)
        }
        
        // テキスト検出から料理名を抽出
        if (textResult?.textAnnotations && textResult.textAnnotations[0]) {
          const detectedText = textResult.textAnnotations[0].description || ''
          const foodKeywords = ['ケーキ', 'チョコ', 'パン', 'サラダ', 'コーヒー', 'cake', 'chocolate', 'bread', 'salad', 'coffee']
          const textKeywords = foodKeywords.filter(keyword => 
            detectedText.toLowerCase().includes(keyword.toLowerCase())
          )
          allDetectedItems.push(...textKeywords)
        }
        
        // 食べ物関連キーワードの優先度付け
        const foodRelatedKeywords = [
          'cake', 'chocolate', 'dessert', 'sweet', 'food', 'dish', 'plate',
          'ケーキ', 'チョコレート', 'デザート', '甘い', '食べ物', '料理', '皿'
        ]
        
        if (allDetectedItems.length > 0) {
          // 重複を除去
          const uniqueItems = [...new Set(allDetectedItems)]
          
          // 食べ物関連のキーワードを優先してソート
          detectedItems = uniqueItems.sort((a, b) => {
            const aIsFoodRelated = foodRelatedKeywords.some(keyword => 
              a.toLowerCase().includes(keyword.toLowerCase())
            )
            const bIsFoodRelated = foodRelatedKeywords.some(keyword => 
              b.toLowerCase().includes(keyword.toLowerCase())
            )
            
            if (aIsFoodRelated && !bIsFoodRelated) return -1
            if (!aIsFoodRelated && bIsFoodRelated) return 1
            return 0
          })
          
          confidence = Math.max(
            labelResult.labelAnnotations?.[0]?.score || 0,
            objectResult?.localizedObjectAnnotations?.[0]?.score || 0
          )
          usingVisionAPI = true
          
          console.log('🔍 統合検出結果:', detectedItems)
          console.log('🎯 最高信頼度:', confidence)
        } else {
          console.warn('⚠️ Vision API: 有効なアイテムが検出されませんでした')
          throw new Error('No relevant items detected')
        }
        
      } catch (visionError: any) {
        console.error('❌ Vision API エラー詳細:', {
          name: visionError.name,
          message: visionError.message,
          stack: visionError.stack,
          code: visionError.code
        })
        
        // フォールバックでモックデータを使用
        const mockResult = mockImageAnalysis(imageData)
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
      const mockResult = mockImageAnalysis(imageData)
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
        
        // 汎用キーワードを除外（精度向上のため）
        const genericKeywords = ['food', 'dish', 'ingredient', 'recipe', 'cooking', 'tableware', '料理', '食べ物', 'メニュー', 'white', 'black', 'red', 'green', 'blue', 'yellow', 'brown', 'dark']
        const searchKeywords = detectedItems.filter(item => 
          !genericKeywords.includes(item.toLowerCase())
        )
        
        console.log('🔍 検索に使用するキーワード:', searchKeywords.join(', '))
        
        // シンプルな直接マッチング検索
        if (searchKeywords.length === 0) {
          console.log('🚫 有効なキーワードなし - 検索をスキップ')
          data = []
        } else {
          console.log('🎯 データベースキーワードとの直接マッチング検索')
          
          const { data: searchData, error: searchError } = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
          
          if (searchError) {
            console.error('❌ データベース検索エラー:', searchError)
            data = []
          } else {
            // 各料理のキーワードと検出キーワードを直接比較
            const matchedDishes = searchData?.filter((dish: any) => {
              const dishKeywords = dish.keywords || []
              const dishName = dish.name.toLowerCase()
              const dishDescription = dish.description.toLowerCase()
              
              // 検出キーワードがDBキーワード、料理名、説明に含まれるかチェック
              const hasMatch = searchKeywords.some((keyword: string) => {
                const keywordLower = keyword.toLowerCase()
                return dishKeywords.some((dk: string) => dk.toLowerCase().includes(keywordLower)) ||
                       dishName.includes(keywordLower) ||
                       dishDescription.includes(keywordLower)
              })
              
              if (hasMatch) {
                console.log(`✅ マッチ: ${dish.name} - キーワード: ${dishKeywords.join(', ')}`)
              }
              
              return hasMatch
            }) || []
            
            data = matchedDishes
            console.log(`📊 マッチした料理: ${data.length}件`)
          }
        }
        
        // フォールバックを完全に無効化（精度重視）
        if (!data || data.length === 0) {
          console.log('🚫 精密検索で結果なし - フォールバック検索をスキップ')
          data = []
        }
        
        // 検索結果の信頼度評価
        if (data && data.length > 0) {
          console.log('🔍 検索結果の詳細分析開始')
          console.log('🔍 検出キーワード:', detectedItems)
          console.log('🔍 検索結果数:', data.length)
          
          // 各料理に信頼度スコアを追加
          data = data.map((dish: any, index: number) => {
            let matchScore = 0
            const dishKeywords = [...(dish.keywords || []), dish.name.toLowerCase(), dish.description.toLowerCase()]
            
            console.log(`\n🍽️ 料理${index + 1}: ${dish.name}`)
            console.log(`   DBキーワード:`, dish.keywords)
            console.log(`   全検索対象:`, dishKeywords)
            
            // 汎用キーワードを除外してマッチング度を計算
            const genericKeywords = ['food', 'dish', 'ingredient', 'recipe', 'cooking', 'tableware', '料理', '食べ物', 'メニュー']
            
            detectedItems.forEach(keyword => {
              // 汎用キーワードは除外
              if (genericKeywords.includes(keyword.toLowerCase())) {
                console.log(`   ⚠️ 汎用キーワードのため除外: "${keyword}"`)
                return
              }
              
              const matched = dishKeywords.some(dk => dk.toLowerCase().includes(keyword.toLowerCase()))
              if (matched) {
                matchScore += 1
                console.log(`   ✅ マッチ: "${keyword}"`)
              } else {
                console.log(`   ❌ 不一致: "${keyword}"`)
              }
            })
            
            console.log(`   📊 最終マッチスコア: ${matchScore}/${detectedItems.length}`)
            
            return {
              ...dish,
              matchScore,
              confidence: Math.min(confidence * (matchScore / Math.max(detectedItems.length, 1)), 1)
            }
          })
          
          // 信頼度でソート
          data.sort((a: any, b: any) => b.matchScore - a.matchScore)
          
          console.log('\n📊 最終スコア一覧:', data.map((d: any) => `${d.name}: ${d.matchScore}/${detectedItems.length}`))
        }
        
        // 最低マッチスコア基準（シンプル）
        const minMatchScore = 1
        if (data && data.length > 0) {
          const filteredResults = data.filter((dish: any) => dish.matchScore >= minMatchScore)
          
          if (filteredResults.length > 0) {
            data = filteredResults
            console.log(`✅ フィルタリング後: ${data.length}件 (マッチスコア≥${minMatchScore})`)
          } else {
            console.log('⚠️ マッチスコアが低すぎるため結果をクリア')
            data = []
          }
        }
        
        // フォールバックを完全に無効化（精度重視）
        if (!data || data.length === 0) {
          console.log('🚫 マッチする料理が見つかりません - フォールバック無効')
          data = []
        }
        
        // 重複を除去し、上位3件に絞る
        if (data && data.length > 0) {
          const uniqueData = data.filter((dish: any, index: number, self: any[]) => 
            index === self.findIndex((d: any) => d.id === dish.id)
          )
          data = uniqueData.slice(0, 3)
        }
      } else {
        // キーワードがない場合は結果なし（精度重視）
        console.log('🚫 キーワードなし - 結果なし')
        data = []
        error = null
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