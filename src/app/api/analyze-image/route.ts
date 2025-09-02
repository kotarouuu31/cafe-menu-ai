import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ImageAnalysisResult } from '@/types/menu'


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
    let weightedItems: Array<{item: string, source: string, confidence: number, weight: number, weightedScore: number}> = []

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
        
        // 検出されたアイテムを統合（重み付けスコアリング対応）
        const detectionResults: Array<{item: string, source: string, confidence: number, weight: number}> = []
        
        // ラベル検出結果（信頼度0.6以上、重み: 1.0）
        if (labelResult.labelAnnotations) {
          labelResult.labelAnnotations
            .filter((label: any) => (label.score || 0) >= 0.6)
            .forEach((label: any) => {
              detectionResults.push({
                item: label.description,
                source: 'label',
                confidence: label.score || 0,
                weight: 1.0
              })
            })
        }
        
        // オブジェクト検出結果（信頼度0.5以上、重み: 1.2 - より具体的）
        if (objectResult.localizedObjectAnnotations) {
          objectResult.localizedObjectAnnotations
            .filter((obj: any) => (obj.score || 0) >= 0.5)
            .forEach((obj: any) => {
              detectionResults.push({
                item: obj.name,
                source: 'object',
                confidence: obj.score || 0,
                weight: 1.2
              })
            })
        }
        
        // テキスト検出から料理名を抽出（重み: 1.5 - 最も具体的）
        if (textResult?.textAnnotations && textResult.textAnnotations[0]) {
          const detectedText = textResult.textAnnotations[0].description || ''
          const foodKeywords = [
            'cake', 'chocolate', 'pancake', 'sandwich', 'salad', 'coffee', 'tiramisu', 'pasta', 'pizza'
          ]
          
          foodKeywords.forEach(keyword => {
            if (detectedText.toLowerCase().includes(keyword.toLowerCase())) {
              detectionResults.push({
                item: keyword,
                source: 'text',
                confidence: 0.9, // テキスト検出は高信頼度
                weight: 1.5
              })
            }
          })
        }
        
        console.log('🔍 検出結果詳細:', detectionResults.map(r => 
          `${r.item} (${r.source}: ${r.confidence.toFixed(2)} × ${r.weight})`
        ))
        
        // 重み付けスコアで統合・ソート
        weightedItems = detectionResults
          .map(result => ({
            ...result,
            weightedScore: result.confidence * result.weight
          }))
          .sort((a, b) => b.weightedScore - a.weightedScore)
        
        const allDetectedItems = weightedItems.map(item => item.item)
        
        // 食べ物関連キーワードの優先度付け
        const foodRelatedKeywords = [
          'cake', 'chocolate', 'dessert', 'sweet', 'food', 'dish', 'plate'
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
        
        // Vision APIエラー時は結果なし
        detectedItems = []
        confidence = 0
        console.log('🔄 Vision APIエラー - 結果なし')
      }
    } else {
      console.log('⚠️ Vision API環境変数が未設定:', {
        hasProjectId: !!process.env.GOOGLE_CLOUD_PROJECT_ID,
        hasClientEmail: !!process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.GOOGLE_CLOUD_PRIVATE_KEY
      })
      
      // Vision API未設定時は結果なし
      detectedItems = []
      confidence = 0
      console.log('🔮 Vision API未設定 - 結果なし')
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
        
        // 汎用キーワードを除外（精度向上のため）- 重要キーワードを保持
        const genericKeywords = [
          // 基本的な食べ物関連（ただしavocado, toast, green, guacamoleは除外しない）
          'food', 'dish', 'meal', 'cuisine', 'ingredient', 'recipe', 'cooking', 'tableware', 'plate', 'bowl',
          'finger food', 'staple food', 'produce', 'condiment', 'bread',
          // 色関連（ただしgreenは除外しない）
          'white', 'black', 'red', 'blue', 'yellow', 'brown', 'dark', 'light', 'colorful',
          // 形状・質感関連
          'round', 'square', 'smooth', 'rough', 'soft', 'hard', 'hot', 'cold',
          // 場所・状況関連
          'table', 'restaurant', 'kitchen', 'eating', 'delicious', 'tasty', 'fresh',
          // その他汎用的すぎるもの
          'night', 'day', 'indoor', 'outdoor', 'person', 'hand', 'finger', 'wood', 'metal', 'glass'
        ]
        
        const searchKeywords = detectedItems.filter(item => {
          const itemLower = item.toLowerCase()
          const isGeneric = genericKeywords.includes(itemLower)
          if (isGeneric) {
            console.log(`🚫 汎用キーワード除外: "${item}"`)
          }
          return !isGeneric
        })
        
        console.log('🔍 検索に使用するキーワード:', searchKeywords.join(', '))
        
        // 検索キーワードが空の場合の処理
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
          
          // 各料理に重み付けスコアを追加
          data = data.map((dish: any, index: number) => {
            let weightedMatchScore = 0
            let totalWeight = 0
            const dishKeywords = [...(dish.keywords || []), dish.name.toLowerCase(), dish.description.toLowerCase()]
            
            console.log(`\n🍽️ 料理${index + 1}: ${dish.name}`)
            console.log(`   DBキーワード:`, dish.keywords)
            console.log(`   全検索対象:`, dishKeywords)
            
            // 汎用キーワードを除外してマッチング度を計算（重み付け対応）- アボカド系キーワードを保持
            const genericKeywords = [
              'food', 'dish', 'meal', 'cuisine', 'ingredient', 'recipe', 'cooking', 'tableware', 'plate', 'bowl',
              'finger food', 'staple food', 'produce', 'condiment', 'bread',
              'white', 'black', 'red', 'blue', 'yellow', 'brown', 'dark', 'light', 'colorful',
              'round', 'square', 'smooth', 'rough', 'soft', 'hard', 'hot', 'cold',
              'table', 'restaurant', 'kitchen', 'eating', 'delicious', 'tasty', 'fresh',
              '料理', '食べ物', 'メニュー', '美味しい', '新鮮', '温かい', '冷たい', '白い', '黒い', '赤い', '緑',
              'night', 'day', 'indoor', 'outdoor', 'person', 'hand', 'finger', 'wood', 'metal', 'glass'
            ]
            
            // weightedItemsが定義されている場合は重み付けスコアを使用
            if (typeof weightedItems !== 'undefined' && weightedItems.length > 0) {
              weightedItems.forEach(weightedItem => {
                // 汎用キーワードは除外
                if (genericKeywords.includes(weightedItem.item.toLowerCase())) {
                  console.log(`   ⚠️ 汎用キーワードのため除外: "${weightedItem.item}"`)
                  return
                }
                
                const matched = dishKeywords.some(dk => dk.toLowerCase().includes(weightedItem.item.toLowerCase()))
                if (matched) {
                  const itemScore = weightedItem.weightedScore
                  weightedMatchScore += itemScore
                  totalWeight += weightedItem.weight
                  console.log(`   ✅ 重み付きマッチ: "${weightedItem.item}" (スコア: ${itemScore.toFixed(2)}, 重み: ${weightedItem.weight})`)
                } else {
                  console.log(`   ❌ 不一致: "${weightedItem.item}"`)
                }
              })
            } else {
              // フォールバック: 従来の方式
              detectedItems.forEach(keyword => {
                if (genericKeywords.includes(keyword.toLowerCase())) {
                  console.log(`   ⚠️ 汎用キーワードのため除外: "${keyword}"`)
                  return
                }
                
                const matched = dishKeywords.some(dk => dk.toLowerCase().includes(keyword.toLowerCase()))
                if (matched) {
                  weightedMatchScore += 1
                  totalWeight += 1
                  console.log(`   ✅ マッチ: "${keyword}"`)
                } else {
                  console.log(`   ❌ 不一致: "${keyword}"`)
                }
              })
            }
            
            const normalizedScore = totalWeight > 0 ? weightedMatchScore / totalWeight : 0
            console.log(`   📊 重み付きマッチスコア: ${weightedMatchScore.toFixed(2)} / 総重み: ${totalWeight.toFixed(2)} = ${normalizedScore.toFixed(2)}`)
            
            return {
              ...dish,
              matchScore: Math.round(weightedMatchScore * 10) / 10, // 小数点1桁で丸める
              weightedScore: normalizedScore,
              confidence: Math.min(confidence * normalizedScore, 1)
            }
          })
          
          // 信頼度でソート
          data.sort((a: any, b: any) => b.matchScore - a.matchScore)
          
          console.log('\n📊 最終スコア一覧:', data.map((d: any) => `${d.name}: ${d.matchScore}/${detectedItems.length}`))
        }
        
        // 最低マッチスコア基準（より柔軟に）
        const minMatchScore = 0.1
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
      console.log('⚠️ Supabase未設定 - 結果なし')
      suggestedDishes = []
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