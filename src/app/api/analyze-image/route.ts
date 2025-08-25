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
        
        // 段階的検索アプローチ
        let searchResults: any[] = []
        
        // Step 1: 完全一致検索（最も信頼度が高い）
        console.log('🎯 Step 1: 完全一致検索')
        for (const keyword of expandedKeywords.slice(0, 3)) { // 上位3キーワードのみ
          const exactResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
            .or(`keywords.cs.["${keyword}"],name.ilike.%${keyword}%`)
            .limit(3)
          
          if (exactResult.data && exactResult.data.length > 0) {
            searchResults.push(...exactResult.data.map((dish: any) => ({
              ...dish,
              searchType: 'exact',
              matchedKeyword: keyword
            })))
            console.log(`✅ "${keyword}" で ${exactResult.data.length}件発見`)
          }
        }
        
        // Step 2: 部分一致検索（完全一致で十分な結果がない場合のみ）
        if (searchResults.length < 2) {
          console.log('🔍 Step 2: 部分一致検索')
          const partialResult = await supabaseAdmin
            .from('dishes')
            .select('*')
            .eq('available', true)
            .or(expandedKeywords.slice(0, 5).map(keyword => 
              `description.ilike.%${keyword}%,chef_comment.ilike.%${keyword}%`
            ).join(','))
            .limit(3)
          
          if (partialResult.data && partialResult.data.length > 0) {
            searchResults.push(...partialResult.data.map((dish: any) => ({
              ...dish,
              searchType: 'partial'
            })))
            console.log(`📊 部分一致で ${partialResult.data.length}件追加`)
          }
        }
        
        data = searchResults
        console.log(`📊 総検索結果: ${data?.length || 0}件`)
        
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
        
        // 検索結果の信頼度評価
        if (data && data.length > 0) {
          console.log('🔍 検索結果の詳細分析開始')
          console.log('🔍 検出キーワード:', expandedKeywords)
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
            
            expandedKeywords.forEach(keyword => {
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
            
            console.log(`   📊 最終マッチスコア: ${matchScore}/${expandedKeywords.length}`)
            
            return {
              ...dish,
              matchScore,
              confidence: Math.min(confidence * (matchScore / Math.max(expandedKeywords.length, 1)), 1)
            }
          })
          
          // 信頼度でソート
          data.sort((a: any, b: any) => b.matchScore - a.matchScore)
          
          console.log('\n📊 最終スコア一覧:', data.map((d: any) => `${d.name}: ${d.matchScore}/${expandedKeywords.length}`))
        }
        
        // 厳格な信頼度フィルタリング
        const minMatchScore = 1 // 最低1つのキーワードマッチが必要
        if (data && data.length > 0) {
          console.log('\n🔍 フィルタリング前の全料理:')
          data.forEach((dish: any, i: number) => {
            console.log(`  ${i + 1}. ${dish.name} - スコア: ${dish.matchScore} (${dish.matchScore >= minMatchScore ? '✅通過' : '❌除外'})`)
          })
          
          const strictResults = data.filter((dish: any) => 
            dish.matchScore >= minMatchScore
          )
          
          console.log(`\n🔍 フィルタリング結果: ${data.length}件 → ${strictResults.length}件`)
          
          if (strictResults.length > 0) {
            data = strictResults
            console.log(`✅ 厳格フィルタリング後: ${data.length}件 (マッチスコア≥${minMatchScore})`)
            console.log('✅ 通過した料理:', data.map(d => `${d.name}(${d.matchScore})`).join(', '))
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