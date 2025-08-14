// 画像解析結果の型定義
export interface VisionAnalysisResult {
  detectedLabels: Array<{
    description: string
    score: number
    confidence: number
  }>
  detectedItems: string[]
  confidence: number
}

// Base64画像データをバッファに変換
export function base64ToBuffer(base64Data: string): Buffer {
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
  return Buffer.from(base64String, 'base64')
}

// 英語ラベル → 日本語キーワード変換マップ
const labelTranslationMap: Record<string, string[]> = {
  // 食べ物・飲み物
  'food': ['食べ物', 'フード'],
  'drink': ['飲み物', 'ドリンク'],
  'beverage': ['飲み物', 'ドリンク'],
  
  // デザート・スイーツ
  'dessert': ['デザート', 'スイーツ'],
  'cake': ['ケーキ'],
  'chocolate': ['チョコレート', 'チョコ'],
  'ice cream': ['アイスクリーム', 'アイス'],
  'cookie': ['クッキー'],
  'pastry': ['ペストリー', 'パン菓子'],
  'pie': ['パイ'],
  'tart': ['タルト'],
  'pudding': ['プリン'],
  
  // コーヒー・茶
  'coffee': ['コーヒー'],
  'espresso': ['エスプレッソ'],
  'latte': ['ラテ', 'カフェラテ'],
  'cappuccino': ['カプチーノ'],
  'tea': ['茶', 'ティー'],
  'green tea': ['緑茶'],
  'black tea': ['紅茶'],
  
  // パン・サンドイッチ
  'bread': ['パン'],
  'sandwich': ['サンドイッチ'],
  'toast': ['トースト'],
  'bagel': ['ベーグル'],
  'croissant': ['クロワッサン'],
  
  // 肉・魚
  'meat': ['肉'],
  'chicken': ['チキン', '鶏肉'],
  'beef': ['ビーフ', '牛肉'],
  'pork': ['ポーク', '豚肉'],
  'fish': ['魚'],
  'salmon': ['サーモン', '鮭'],
  'tuna': ['ツナ', 'マグロ'],
  'bacon': ['ベーコン'],
  
  // 野菜・果物
  'vegetable': ['野菜'],
  'fruit': ['果物', 'フルーツ'],
  'salad': ['サラダ'],
  'tomato': ['トマト'],
  'lettuce': ['レタス'],
  'onion': ['玉ねぎ'],
  'potato': ['ポテト', 'じゃがいも'],
  
  // 乳製品
  'milk': ['ミルク', '牛乳'],
  'cheese': ['チーズ'],
  'butter': ['バター'],
  'cream': ['クリーム'],
  'yogurt': ['ヨーグルト'],
  
  // その他
  'egg': ['卵'],
  'rice': ['米', 'ライス'],
  'pasta': ['パスタ'],
  'noodle': ['麺', 'ヌードル'],
  'soup': ['スープ'],
  'sauce': ['ソース'],
  'sugar': ['砂糖'],
  'salt': ['塩'],
}

// 食べ物関連のラベルかどうかを判定
const foodRelatedLabels = new Set(Object.keys(labelTranslationMap))

export function isFoodRelated(label: string): boolean {
  return foodRelatedLabels.has(label.toLowerCase())
}

export function translateLabelToJapanese(label: string): string[] {
  const lowerLabel = label.toLowerCase()
  return labelTranslationMap[lowerLabel] || [label]
}

// Google Cloud Vision APIのアクセストークン取得
async function getAccessToken(): Promise<string> {
  const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n')
  const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL
  
  if (!privateKey || !clientEmail) {
    throw new Error('Google Cloud credentials not configured')
  }
  
  try {
    const { sign } = await import('jsonwebtoken')
    
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 3600 // 1時間有効
    
    const payload = {
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat,
      exp,
    }
    
    const token = sign(payload, privateKey, { algorithm: 'RS256' })
    
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: token,
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Token request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('Access token error:', error)
    throw new Error('Failed to get access token')
  }
}

// Google Vision APIで画像を解析（REST API使用）
export async function analyzeImageWithVision(imageBuffer: Buffer): Promise<VisionAnalysisResult> {
  try {
    console.log('🔍 Vision API解析開始')
    
    // アクセストークン取得
    const accessToken = await getAccessToken()
    console.log('✅ アクセストークン取得成功')
    
    // Vision API REST呼び出し
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const base64Image = imageBuffer.toString('base64')
    
    const response = await fetch(
      `https://vision.googleapis.com/v1/projects/${projectId}/images:annotate`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              image: {
                content: base64Image,
              },
              features: [
                {
                  type: 'LABEL_DETECTION',
                  maxResults: 20,
                },
              ],
            },
          ],
        }),
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('Vision API error response:', errorText)
      throw new Error(`Vision API request failed: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('📊 Vision API レスポンス受信')
    
    const labels = data.responses?.[0]?.labelAnnotations || []
    console.log('🏷️ 検出されたラベル数:', labels.length)
    
    // 食べ物関連のラベルのみをフィルタリング
    const foodLabels = labels.filter((label: { description?: string }) => 
      label.description && isFoodRelated(label.description)
    )
    
    console.log('🍽️ 食べ物関連ラベル数:', foodLabels.length)
    
    // 日本語キーワードに変換
    const detectedItems: string[] = []
    const detectedLabels = foodLabels.map((label: { description?: string; score?: number }) => {
      const description = label.description || ''
      const score = label.score || 0
      const confidence = score // Vision APIではscoreがconfidenceと同じ
      
      // 日本語キーワードを追加
      const japaneseKeywords = translateLabelToJapanese(description)
      detectedItems.push(...japaneseKeywords)
      
      console.log(`🔖 ${description} → ${japaneseKeywords.join(', ')} (信頼度: ${Math.round(confidence * 100)}%)`)
      
      return {
        description,
        score,
        confidence,
      }
    })
    
    // 重複を削除
    const uniqueDetectedItems = [...new Set(detectedItems)]
    
    // 平均信頼度を計算
    const averageConfidence = detectedLabels.length > 0
      ? detectedLabels.reduce((sum: number, label: { confidence: number }) => sum + label.confidence, 0) / detectedLabels.length
      : 0
    
    console.log('✅ Vision API解析完了')
    console.log('📝 検出キーワード:', uniqueDetectedItems)
    console.log('📊 平均信頼度:', Math.round(averageConfidence * 100), '%')
    
    return {
      detectedLabels,
      detectedItems: uniqueDetectedItems,
      confidence: averageConfidence,
    }
  } catch (error: unknown) {
    const err = error as Error
    console.error('💥 Google Vision API error:', err)
    throw new Error(`Failed to analyze image with Google Vision API: ${err.message}`)
  }
}
