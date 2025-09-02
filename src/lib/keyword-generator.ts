import { ImageAnnotatorClient } from '@google-cloud/vision'

interface KeywordGenerationResult {
  keywords: string[]
  confidence: number
}

export class AutoKeywordGenerator {
  private visionClient: ImageAnnotatorClient

  constructor() {
    if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GOOGLE_CLOUD_CLIENT_EMAIL || !process.env.GOOGLE_CLOUD_PRIVATE_KEY) {
      throw new Error('Google Cloud Vision API環境変数が設定されていません')
    }

    this.visionClient = new ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      credentials: {
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
    })
  }

  /**
   * 料理画像からキーワードを自動生成
   */
  async generateKeywords(imageBuffer: Buffer, dishName: string, category: string): Promise<KeywordGenerationResult> {
    try {
      // Vision API で複数の検出を実行
      const [labelResult] = await this.visionClient.labelDetection({ image: { content: imageBuffer } })
      const [objectResult] = await this.visionClient.objectLocalization({ image: { content: imageBuffer } })
      const [textResult] = await this.visionClient.textDetection({ image: { content: imageBuffer } })

      // 検出結果を統合
      const detectedLabels = labelResult?.labelAnnotations
        ?.filter(label => (label.score || 0) >= 0.6)
        .map(label => label.description || '') || []

      const detectedObjects = objectResult?.localizedObjectAnnotations
        ?.filter(obj => (obj.score || 0) >= 0.5)
        .map(obj => obj.name || '') || []

      // キーワード生成
      const keywords = this.generateSemanticKeywords(dishName, category, detectedLabels, detectedObjects)

      // 信頼度計算
      const avgConfidence = this.calculateConfidence(labelResult?.labelAnnotations || [])

      return {
        keywords,
        confidence: avgConfidence
      }
    } catch (error) {
      console.error('キーワード生成エラー:', error)
      return this.getFallbackKeywords(dishName, category)
    }
  }

  /**
   * 意味的キーワード生成（英語のみ）
   */
  private generateSemanticKeywords(dishName: string, category: string, labels: string[], objects: string[]): string[] {
    const keywords = new Set<string>()

    // カテゴリベース英語キーワード
    const categoryKeywords = this.getCategoryKeywords(category)
    categoryKeywords.forEach(k => keywords.add(k))

    // Vision API検出結果から生成（英語のみ）
    const detectedKeywords = [...labels, ...objects]
    detectedKeywords.forEach(detected => {
      // 英語キーワード追加
      keywords.add(detected.toLowerCase())
    })

    // 料理名から推測される英語キーワード
    const nameBasedKeywords = this.getNameBasedKeywords(dishName)
    nameBasedKeywords.forEach(k => keywords.add(k))

    return Array.from(keywords).filter(k => k.length > 0)
  }


  /**
   * カテゴリ別キーワード辞書（英語のみ）
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryMap: { [key: string]: string[] } = {
      'デザート': ['dessert', 'sweet'],
      '軽食': ['light meal', 'snack'],
      'ドリンク': ['drink', 'beverage'],
      'フード': ['main dish', 'entree'],
      'サラダ': ['salad', 'vegetables']
    }
    return categoryMap[category] || ['dish']
  }


  /**
   * 料理名ベースキーワード生成（Vision API結果に依存）
   */
  private getNameBasedKeywords(dishName: string): string[] {
    // Vision APIが英語キーワードを検出するため、
    // 日本語料理名からの推測は不要
    return []
  }


  /**
   * 信頼度計算
   */
  private calculateConfidence(annotations: any[]): number {
    if (annotations.length === 0) return 0
    const avgScore = annotations.reduce((sum, ann) => sum + (ann.score || 0), 0) / annotations.length
    return Math.round(avgScore * 100) / 100
  }

  /**
   * フォールバックキーワード（英語のみ）
   */
  private getFallbackKeywords(dishName: string, category: string): KeywordGenerationResult {
    // カテゴリベース英語キーワード
    const categoryKeywords = this.getCategoryKeywords(category)
    
    // 料理名ベース英語キーワード
    const nameBasedKeywords = this.getNameBasedKeywords(dishName)
    
    const keywords = new Set<string>()
    categoryKeywords.forEach(k => keywords.add(k))
    nameBasedKeywords.forEach(k => keywords.add(k))
    
    return {
      keywords: Array.from(keywords).filter(k => k.length > 0),
      confidence: 0.5
    }
  }
}

