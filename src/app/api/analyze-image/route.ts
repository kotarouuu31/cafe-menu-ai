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

    const formData = await request.formData()
    const imageFile = formData.get('image') as File

    if (!imageFile) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    // ファイルをBase64に変換
    const arrayBuffer = await imageFile.arrayBuffer()
    const imageData = Buffer.from(arrayBuffer).toString('base64')

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
        
        // スマートなキーワードマッピング（コンテキスト重視）
        const keywordMappings: { [key: string]: string[] } = {
          // デザート系
          'cake': ['ケーキ', 'デザート', 'スイーツ'],
          'chocolate': ['チョコレート', 'チョコ', 'カカオ'],
          'dessert': ['デザート', 'ケーキ', 'スイーツ'],
          'sweet': ['甘い', 'デザート', 'スイーツ'],
          
          // パン・サンドイッチ系
          'sandwich': ['サンドイッチ', 'パン', '軽食', 'ランチ'],
          'bread': ['パン', '食パン', 'サンドイッチ', '軽食'],
          'finger food': ['軽食', 'スナック', 'つまみ'],
          'fast food': ['ファストフード', '軽食', 'ハンバーガー'],
          'tramezzino': ['サンドイッチ', 'パン', '軽食'],
          
          // 飲み物系
          'coffee': ['コーヒー', 'ドリンク', 'カフェイン'],
          'drink': ['ドリンク', '飲み物', '飲料'],
          
          // 一般的な食べ物
          'food': ['料理', '食べ物', 'メニュー'],
          'dish': ['料理', '皿', '一品'],
          'plate': ['皿', 'プレート'],
          'ingredient': ['材料', '食材'],
          'vegetable': ['野菜', 'サラダ', 'ヘルシー'],
          
          // 調理方法
          'baked': ['焼いた', 'ベーキング', 'オーブン'],
          'fried': ['揚げた', 'フライ', '油'],
          
          // 色・質感（限定的に使用）
          'brown': ['茶色', 'チョコレート', 'コーヒー'],
          'dark': ['暗い', 'チョコレート', 'ビター']
        }
        
        // 色だけのキーワードは除外（コンテキストが不明確なため）
        const colorOnlyKeywords = ['white', 'black', 'red', 'green', 'blue', 'yellow']
        const filteredItems = detectedItems.filter(item => 
          !colorOnlyKeywords.includes(item.toLowerCase())
        )
        
        // 拡張キーワードを生成（フィルタリング済みアイテムから）
        const expandedKeywords: string[] = []
        
        // フィルタリングされたアイテムがない場合の処理を改善
        if (filteredItems.length === 0) {
          console.log('🎨 色のみ検出のため、一般的な料理で検索します')
          expandedKeywords.push('料理', '食べ物', 'メニュー', 'food', 'dish')
        } else {
          filteredItems.forEach(item => {
            expandedKeywords.push(item.toLowerCase())
            const mappedKeywords = keywordMappings[item.toLowerCase()]
            if (mappedKeywords) {
              expandedKeywords.push(...mappedKeywords)
            }
          })
        }
        
        console.log(`🔍 フィルタリング後: ${filteredItems.join(', ')}`)
        console.log(`🔍 拡張キーワード: ${expandedKeywords.join(', ')}`)
        
        // 最初に精密な検索を試行（JSONB配列用のcontains演算子を使用）
        let preciseResult = await supabaseAdmin
          .from('dishes')
          .select('*')
          .eq('available', true)
          .or(expandedKeywords.map(keyword => 
            `keywords.cs.["${keyword}"],name.ilike.%${keyword}%,description.ilike.%${keyword}%`
          ).join(','))
          .limit(5)
        
        data = preciseResult.data
        error = preciseResult.error
        
        console.log(`📊 精密検索結果: ${data?.length || 0}件`)
        
        // 精密検索で結果が少ない場合は、スマートカテゴリ検索（ただし1件以上あれば追加検索は控えめに）
        if (!data || data.length === 0) {
          console.log('🔍 スマートカテゴリ検索にフォールバック')
          
          // 検出されたキーワードに基づいてカテゴリを推定
          const categoryMapping: { [key: string]: string[] } = {
            'sandwich': ['軽食', 'フード'],
            'bread': ['軽食', 'フード'],
            'cake': ['デザート'],
            'dessert': ['デザート'],
            'coffee': ['ドリンク'],
            'salad': ['サラダ'],
            'pasta': ['フード']
          }
          
          let targetCategories: string[] = []
          filteredItems.forEach(item => {
            const categories = categoryMapping[item.toLowerCase()]
            if (categories) {
              targetCategories.push(...categories)
            }
          })
          
          // 重複除去
          targetCategories = [...new Set(targetCategories)]
          
          if (targetCategories.length > 0) {
            console.log(`🎯 推定カテゴリ: ${targetCategories.join(', ')}`)
            
            for (const category of targetCategories) {
              const categoryResult = await supabaseAdmin
                .from('dishes')
                .select('*')
                .eq('available', true)
                .eq('category', category)
                .limit(3)
              
              if (categoryResult.data && categoryResult.data.length > 0) {
                data = [...(data || []), ...categoryResult.data]
                console.log(`📊 ${category}カテゴリ検索結果: ${categoryResult.data.length}件追加`)
                break // 最初にマッチしたカテゴリで十分
              }
            }
          }
          
          // まだ結果が少ない場合は、幅広いキーワード検索
          if (!data || data.length < 2) {
            const broadResult = await supabaseAdmin
              .from('dishes')
              .select('*')
              .eq('available', true)
              .or(`keywords.cs.["軽食"],keywords.cs.["サンドイッチ"],keywords.cs.["パン"],keywords.cs.["ケーキ"],keywords.cs.["デザート"]`)
              .limit(5)
            
            if (broadResult.data && broadResult.data.length > 0) {
              data = [...(data || []), ...broadResult.data]
              console.log(`📊 幅広い検索結果: ${broadResult.data.length}件追加`)
            }
          }
        }
        
        // 最終的なフォールバック: 人気料理を取得
        if (!data || data.length === 0) {
          console.log('🎲 人気料理にフォールバック')
          const popularResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
            .eq('popular', true)
            .limit(3)
          
          if (popularResult.data && popularResult.data.length > 0) {
            data = popularResult.data
            console.log('🎲 人気料理:', data.map((d: any) => d.name))
          } else {
            // 最終手段: ランダム選択
            const randomResult = await supabaseAdmin
              .from('dishes')
              .select('*')
              .eq('available', true)
              .limit(10)
            
            if (randomResult.data && randomResult.data.length > 0) {
              const shuffled = randomResult.data.sort(() => Math.random() - 0.5)
              data = shuffled.slice(0, 3)
              console.log('🎲 ランダム結果:', data.map((d: any) => d.name))
            }
          }
        }
        
        // 重複を除去し、上位3件に絞る
        if (data && data.length > 0) {
          const uniqueData = data.filter((dish: any, index: number, self: any[]) => 
            index === self.findIndex((d: any) => d.id === dish.id)
          )
          data = uniqueData.slice(0, 3)
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