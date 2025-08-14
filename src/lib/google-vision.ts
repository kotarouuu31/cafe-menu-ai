import { ImageAnnotatorClient } from '@google-cloud/vision'

// Google Cloud Vision APIクライアントの初期化
let visionClient: ImageAnnotatorClient | null = null

export function getVisionClient(): ImageAnnotatorClient {
  if (!visionClient) {
    // 環境変数から認証情報を取得
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    let privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY
    const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL

    if (!projectId || !privateKey || !clientEmail) {
      throw new Error('Google Cloud Vision API credentials are not properly configured')
    }

    // Private Keyの改行文字を確実に処理
    privateKey = privateKey.replace(/\\n/g, '\n')
    
    // デバッグ用ログ
    console.log('Vision Client初期化:')
    console.log('Project ID:', projectId)
    console.log('Client Email:', clientEmail)
    console.log('Private Key starts with:', privateKey.substring(0, 50))
    console.log('Private Key ends with:', privateKey.substring(privateKey.length - 50))

    try {
      visionClient = new ImageAnnotatorClient({
        projectId,
        credentials: {
          private_key: privateKey,
          client_email: clientEmail,
        },
      })
      console.log('✅ Vision Client初期化成功')
    } catch (error) {
      console.error('❌ Vision Client初期化エラー:', error)
      throw error
    }
  }

  return visionClient
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
  'chocolate': ['チョコレート'],
  'ice cream': ['アイスクリーム', 'アイス'],
  'cookie': ['クッキー'],
  'pastry': ['ペストリー', 'パン菓子'],
  'pie': ['パイ'],
  'tart': ['タルト'],
  'pudding': ['プリン'],
  
  // コーヒー・茶
  'coffee': ['コーヒー'],
  'espresso': ['エスプレッソ'],
  'latte': ['ラテ'],
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
const foodRelatedLabels = new Set([
  'food', 'drink', 'beverage', 'dessert', 'cake', 'chocolate', 'ice cream',
  'cookie', 'pastry', 'pie', 'tart', 'pudding', 'coffee', 'espresso', 'latte',
  'cappuccino', 'tea', 'green tea', 'black tea', 'bread', 'sandwich', 'toast',
  'bagel', 'croissant', 'meat', 'chicken', 'beef', 'pork', 'fish', 'salmon',
  'tuna', 'vegetable', 'fruit', 'salad', 'tomato', 'lettuce', 'onion', 'potato',
  'milk', 'cheese', 'butter', 'cream', 'yogurt', 'egg', 'rice', 'pasta',
  'noodle', 'soup', 'sauce', 'sugar', 'salt'
])

export function isFoodRelated(label: string): boolean {
  return foodRelatedLabels.has(label.toLowerCase())
}

export function translateLabelToJapanese(label: string): string[] {
  const lowerLabel = label.toLowerCase()
  return labelTranslationMap[lowerLabel] || [label]
}

// Base64画像データをバッファに変換
export function base64ToBuffer(base64Data: string): Buffer {
  // データURLプレフィックスを削除
  const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/, '')
  return Buffer.from(base64String, 'base64')
}

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

// Google Vision APIで画像を解析
export async function analyzeImageWithVision(imageBuffer: Buffer): Promise<VisionAnalysisResult> {
  try {
    const client = getVisionClient()
    
    // Label Detection APIを呼び出し
    const [result] = await client.labelDetection({
      image: { content: imageBuffer },
    })
    
    const labels = result.labelAnnotations || []
    
    // 食べ物関連のラベルのみをフィルタリング
    const foodLabels = labels.filter(label => 
      label.description && isFoodRelated(label.description)
    )
    
    // 日本語キーワードに変換
    const detectedItems: string[] = []
    const detectedLabels = foodLabels.map(label => {
      const description = label.description || ''
      const score = label.score || 0
      const confidence = label.confidence || 0
      
      // 日本語キーワードを追加
      const japaneseKeywords = translateLabelToJapanese(description)
      detectedItems.push(...japaneseKeywords)
      
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
      ? detectedLabels.reduce((sum, label) => sum + label.confidence, 0) / detectedLabels.length
      : 0
    
    return {
      detectedLabels,
      detectedItems: uniqueDetectedItems,
      confidence: averageConfidence,
    }
  } catch (error) {
    console.error('Google Vision API error:', error)
    throw new Error('Failed to analyze image with Google Vision API')
  }
}
