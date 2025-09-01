'use client'

import React, { useState, useEffect } from 'react'
import { Loader2, Wand2, Upload, RefreshCw } from 'lucide-react'

interface KeywordResult {
  keywords: string[]
  visual_keywords: string[]
  confidence: number
}

// Simple UI components
const Button = ({ children, onClick, disabled, variant, className, ...props }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-md font-medium transition-colors ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
    } ${
      variant === 'outline' 
        ? 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
        : className || 'bg-blue-600 text-white hover:bg-blue-700'
    }`}
    {...props}
  >
    {children}
  </button>
)

const Card = ({ children, className }: any) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className || ''}`}>
    {children}
  </div>
)

const CardHeader = ({ children }: any) => (
  <div className="p-6 pb-4">{children}</div>
)

const CardTitle = ({ children, className }: any) => (
  <h3 className={`text-lg font-semibold ${className || ''}`}>{children}</h3>
)

const CardDescription = ({ children }: any) => (
  <p className="text-sm text-gray-600 mt-1">{children}</p>
)

const CardContent = ({ children, className }: any) => (
  <div className={`p-6 pt-0 ${className || ''}`}>{children}</div>
)

const Badge = ({ children, variant }: any) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    variant === 'secondary'
      ? 'bg-gray-100 text-gray-800'
      : 'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

const toast = {
  success: (message: string) => alert(`✅ ${message}`),
  error: (message: string) => alert(`❌ ${message}`)
}

interface Dish {
  id: string
  name: string
  category: string
  keywords: string[]
}

export function KeywordManager() {
  const [isGenerating, setIsGenerating] = useState(false)
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)
  const [previewResult, setPreviewResult] = useState<KeywordResult | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [dishes, setDishes] = useState<Dish[]>([])
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 料理データ取得
  const fetchDishes = async () => {
    try {
      const response = await fetch('/api/dishes')
      const data = await response.json()
      if (data.success) {
        setDishes(data.dishes)
      }
    } catch (error) {
      toast.error('料理データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初期化
  useEffect(() => {
    fetchDishes()
  }, [])

  // 単一画像からキーワード生成
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selectedDish) {
      toast.error('料理を選択してください')
      return
    }

    setIsGenerating(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string
        setSelectedImage(imageData)

        const response = await fetch('/api/generate-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dishId: selectedDish.id,
            imageData,
            dishName: selectedDish.name,
            category: selectedDish.category
          })
        })

        const result = await response.json()
        if (result.success) {
          setPreviewResult({
            keywords: result.keywords,
            visual_keywords: result.visual_keywords || [],
            confidence: result.confidence
          })
          toast.success(`${selectedDish.name}のキーワードを生成・更新しました！`)
          // 料理リストを再取得
          fetchDishes()
        } else {
          toast.error('キーワード生成に失敗しました')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('エラーが発生しました')
    } finally {
      setIsGenerating(false)
    }
  }

  // 全料理のキーワード一括更新
  const handleBulkUpdate = async (dryRun: boolean = false) => {
    setIsBulkUpdating(true)
    try {
      const response = await fetch('/api/bulk-update-keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      })

      const result = await response.json()
      if (result.success) {
        toast.success(
          `${result.summary.success}件の料理のキーワードを${dryRun ? 'プレビュー' : '更新'}しました`
        )
        console.log('更新結果:', result.results)
      } else {
        toast.error('一括更新に失敗しました')
      }
    } catch (error) {
      toast.error('エラーが発生しました')
    } finally {
      setIsBulkUpdating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">🤖 AI キーワード管理</h1>
        <p className="text-muted-foreground mt-2">
          手動設定から解放！画像解析による自動キーワード生成
        </p>
      </div>

      {/* 料理選択 */}
      <Card>
        <CardHeader>
          <CardTitle>📋 料理選択</CardTitle>
          <CardDescription>
            キーワードを更新する料理を選択してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              料理データを読み込み中...
            </div>
          ) : (
            <div className="space-y-3">
              <select
                value={selectedDish?.id || ''}
                onChange={(e) => {
                  const dish = dishes.find(d => d.id === e.target.value)
                  setSelectedDish(dish || null)
                  setPreviewResult(null)
                  setSelectedImage(null)
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">料理を選択...</option>
                {dishes.map((dish) => (
                  <option key={dish.id} value={dish.id}>
                    {dish.name} ({dish.category})
                  </option>
                ))}
              </select>
              
              {selectedDish && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800">{selectedDish.name}</h4>
                  <p className="text-sm text-blue-600">カテゴリ: {selectedDish.category}</p>
                  <div className="mt-2">
                    <p className="text-xs text-blue-600 mb-1">現在のキーワード:</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedDish.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 画像アップロードテスト */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            キーワード生成テスト
          </CardTitle>
          <CardDescription>
            料理画像をアップロードして、自動生成されるキーワードを確認
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              disabled={isGenerating || !selectedDish}
            />
            {isGenerating && <Loader2 className="h-4 w-4 animate-spin" />}
            {!selectedDish && (
              <p className="text-sm text-gray-500">まず料理を選択してください</p>
            )}
          </div>

          {selectedImage && (
            <div className="mt-4">
              <img 
                src={selectedImage} 
                alt="アップロード画像" 
                className="max-w-xs rounded-lg shadow-md"
              />
            </div>
          )}

          {previewResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">生成されたキーワード:</h4>
                  <div className="flex flex-wrap gap-1">
                    {(previewResult.keywords || []).map((keyword, index) => (
                      <Badge key={index} variant="default">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">視覚的キーワード:</h4>
                  <div className="flex flex-wrap gap-1">
                    {(previewResult.visual_keywords || []).map((keyword, index) => (
                      <Badge key={index} variant="secondary">{keyword}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  信頼度: {Math.round(previewResult.confidence * 100)}%
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 一括更新機能 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            全料理キーワード一括更新
          </CardTitle>
          <CardDescription>
            データベース内の全料理のキーワードを自動生成して更新
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <Button
              onClick={() => handleBulkUpdate(true)}
              disabled={isBulkUpdating}
              variant="outline"
            >
              {isBulkUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              プレビュー実行
            </Button>
            
            <Button
              onClick={() => handleBulkUpdate(false)}
              disabled={isBulkUpdating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {isBulkUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              本番実行
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• プレビュー: データベースを変更せずに生成結果を確認</p>
            <p>• 本番実行: 実際にデータベースのキーワードを更新</p>
            <p>• 処理時間: 約10-20秒（料理数によって変動）</p>
          </div>
        </CardContent>
      </Card>

      {/* 機能説明 */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 自動生成の特徴</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-green-600">✅ 解決される問題</h4>
              <ul className="text-sm space-y-1 mt-2">
                <li>• 手動入力の手間とミス</li>
                <li>• 英語キーワードの不足</li>
                <li>• 視覚的特徴の見落とし</li>
                <li>• 検索精度の不安定性</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-blue-600">🚀 自動生成機能</h4>
              <ul className="text-sm space-y-1 mt-2">
                <li>• Vision API による画像解析</li>
                <li>• 日英両言語対応</li>
                <li>• カテゴリ別最適化</li>
                <li>• 信頼度ベース品質保証</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
