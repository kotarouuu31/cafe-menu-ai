import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { analyzeImageWithVision, base64ToBuffer } from '@/lib/google-vision'

const analyzeImageSchema = z.object({
  imageData: z.string().min(1, '画像データは必須です'), // Base64 encoded image data
})

// 画像サイズ制限（10MB）
const MAX_IMAGE_SIZE = 10 * 1024 * 1024

// モック画像解析：Google Vision APIが利用できない場合のフォールバック
function mockImageAnalysis(): { detectedItems: string[]; confidence: number } {
  // 現在登録されているメニューに対応するキーワードセット
  const menuBasedKeywords = [
    // ガトーショコラ用
    ['チョコレート', 'ケーキ', 'デザート', 'chocolate', 'cake'],
    ['チョコ', 'スイーツ', 'ケーキ', 'dessert'],
    
    // カフェラテ用
    ['コーヒー', 'ラテ', 'ドリンク', 'coffee', 'latte'],
    ['ミルク', 'エスプレッソ', 'milk', 'espresso'],
    
    // クラブハウスサンドイッチ用
    ['サンドイッチ', 'チキン', 'ベーコン', 'sandwich', 'chicken'],
    ['パン', 'レタス', 'トマト', 'bread', 'bacon'],
    
    // 一般的な食べ物
    ['food', '食べ物', 'フード'],
    ['drink', '飲み物', 'ドリンク'],
  ]
  
  // ランダムにキーワードセットを選択
  const randomIndex = Math.floor(Math.random() * menuBasedKeywords.length)
  const detectedItems = menuBasedKeywords[randomIndex]
  
  // 信頼度を0.8-0.95の範囲で生成（より高い信頼度）
  const confidence = Math.random() * 0.15 + 0.8
  
  return {
    detectedItems,
    confidence: Math.round(confidence * 100) / 100,
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = analyzeImageSchema.parse(body)
    
    // 画像データの前処理
    let imageBuffer: Buffer
    try {
      imageBuffer = base64ToBuffer(validatedData.imageData)
      
      if (imageBuffer.length > MAX_IMAGE_SIZE) {
        return NextResponse.json(
          { error: '画像サイズが大きすぎます。10MB以下のファイルを使用してください。' },
          { status: 400 }
        )
      }
    } catch (error) {
      return NextResponse.json(
        { error: '無効な画像データです。' },
        { status: 400 }
      )
    }
    
    let analysisResult: { detectedItems: string[]; confidence: number }
    const debugInfo: Record<string, any> = {}
    
    // Google Vision APIが設定されているかチェック（詳細ログ付き）
    const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
    const privateKey = process.env.GOOGLE_CLOUD_PRIVATE_KEY
    const clientEmail = process.env.GOOGLE_CLOUD_CLIENT_EMAIL
    
    debugInfo.envCheck = {
      hasProjectId: !!projectId,
      hasPrivateKey: !!privateKey,
      hasClientEmail: !!clientEmail,
      projectIdLength: projectId?.length || 0,
      privateKeyPrefix: privateKey?.substring(0, 30) || 'none',
      clientEmailDomain: clientEmail?.split('@')[1] || 'none'
    }
    
    const hasVisionCredentials = projectId && privateKey && clientEmail
    
    if (hasVisionCredentials) {
      try {
        console.log('=== Google Vision API 呼び出し開始 ===')
        console.log('Project ID:', projectId)
        console.log('Client Email:', clientEmail)
        console.log('Private Key prefix:', privateKey?.substring(0, 50))
        console.log('Image buffer size:', imageBuffer.length)
        
        const visionResult = await analyzeImageWithVision(imageBuffer)
        
        console.log('=== Vision API 成功 ===')
        console.log('検出されたラベル数:', visionResult.detectedLabels.length)
        console.log('検出されたアイテム:', visionResult.detectedItems)
        
        analysisResult = {
          detectedItems: visionResult.detectedItems,
          confidence: visionResult.confidence,
        }
        
        debugInfo.visionSuccess = true
        debugInfo.labelsCount = visionResult.detectedLabels.length
        
      } catch (visionError: unknown) {
        console.error('=== Google Vision API エラー詳細 ===')
        const error = visionError as any
        console.error('エラー名:', error.name)
        console.error('エラーメッセージ:', error.message)
        console.error('エラーコード:', error.code)
        console.error('エラー詳細:', JSON.stringify(error, null, 2))
        console.error('スタックトレース:', error.stack)
        
        // gRPCエラーの詳細
        if (error.details) {
          console.error('gRPC詳細:', error.details)
        }
        
        // HTTPレスポンスエラーの詳細
        if (error.response) {
          console.error('レスポンスステータス:', error.response.status)
          console.error('レスポンスヘッダー:', error.response.headers)
          console.error('レスポンスデータ:', JSON.stringify(error.response.data, null, 2))
        }
        
        // Google Cloud特有のエラー
        if (error.metadata) {
          console.error('メタデータ:', error.metadata)
        }
        
        debugInfo.visionError = {
          name: error.name || 'Unknown',
          message: error.message || 'Unknown error',
          code: error.code,
          details: error.details,
          status: error.response?.status,
          fullError: JSON.stringify(error, null, 2)
        }
        
        // Vision APIエラー時はモックにフォールバック
        console.log('Vision APIエラーのため、モック解析を使用')
        await new Promise(resolve => setTimeout(resolve, 1500))
        analysisResult = mockImageAnalysis()
      }
    } else {
      console.log('=== 環境変数が不足しています ===')
      console.log('Debug info:', debugInfo.envCheck)
      await new Promise(resolve => setTimeout(resolve, 1500))
      analysisResult = mockImageAnalysis()
    }
    
    // メニュー検索
    const searchResponse = await fetch(`${request.nextUrl.origin}/api/search-menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keywords: analysisResult.detectedItems }),
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
      usingVisionAPI: hasVisionCredentials && !debugInfo.visionError,
      debugInfo // デバッグ情報を含める
    }
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('=== 全体エラー ===', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
