'use client'

import { useState } from 'react'
import { Loader2, Upload, Wand2, Check, ArrowRight } from 'lucide-react'

// Simple UI components (same as KeywordManager)
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

interface DishFormData {
  name: string
  name_en: string
  category: string
  price: number
  description: string
  chef_comment: string
  recommendation: string
  pairing_suggestion: string
  ingredients: string[]
  allergens: string[]
  calories: number
  image: File | null
}

interface GeneratedKeywords {
  keywords: string[]
  confidence: number
}

export function NewDishWizard() {
  const [step, setStep] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState<DishFormData>({
    name: '',
    name_en: '',
    category: 'フード',
    price: 0,
    description: '',
    chef_comment: '',
    recommendation: '',
    pairing_suggestion: '',
    ingredients: [],
    allergens: [],
    calories: 0,
    image: null
  })
  const [generatedKeywords, setGeneratedKeywords] = useState<GeneratedKeywords | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  const categories = ['デザート', 'フード', '軽食', 'ドリンク', 'サラダ']
  const commonIngredients = ['小麦', '卵', '乳製品', '大豆', 'エビ', 'カニ', 'そば', '落花生']

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, image: file }))
      
      // プレビュー表示
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const generateKeywords = async () => {
    if (!formData.image) return

    setIsProcessing(true)
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const imageData = e.target?.result as string

        const response = await fetch('/api/generate-keywords', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData,
            dishName: formData.name,
            category: formData.category
          })
        })

        const result = await response.json()
        if (result.success) {
          setGeneratedKeywords({
            keywords: result.keywords,
            confidence: result.confidence
          })
          setStep(3)
        } else {
          alert('❌ キーワード生成に失敗しました')
        }
      }
      reader.readAsDataURL(formData.image)
    } catch (error) {
      alert('❌ エラーが発生しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const createDishComplete = async () => {
    setIsProcessing(true)
    try {
      // 画像をアップロード（実際の実装では画像ホスティングサービスを使用）
      let imageUrl = ''
      if (formData.image && previewImage) {
        // 簡易実装: base64データURLをそのまま使用
        // 本番環境では Cloudinary, AWS S3 等を使用推奨
        imageUrl = previewImage
      }

      // Notionに料理を作成
      const response = await fetch('/api/create-notion-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          name_en: formData.name_en,
          price: formData.price,
          category: formData.category,
          description: formData.description,
          chef_comment: formData.chef_comment,
          recommendation: formData.recommendation,
          pairing_suggestion: formData.pairing_suggestion,
          ingredients: formData.ingredients,
          allergens: formData.allergens,
          keywords: generatedKeywords?.keywords || [],
          calories: formData.calories,
          imageUrl: imageUrl
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`✅ ${result.dish_name} を作成しました！\nNotion ID: ${result.notion_id}`)
        
        // リセット
        setStep(1)
        setFormData({
          name: '',
          name_en: '',
          category: 'フード',
          price: 0,
          description: '',
          chef_comment: '',
          recommendation: '',
          pairing_suggestion: '',
          ingredients: [],
          allergens: [],
          calories: 0,
          image: null
        })
        setGeneratedKeywords(null)
        setPreviewImage(null)
      } else {
        alert(`❌ 料理作成に失敗しました: ${result.error}`)
      }
      
    } catch (error) {
      console.error('料理作成エラー:', error)
      alert('❌ 料理作成に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold">🍽️ 新料理追加ウィザード</h1>
        <p className="text-gray-600 mt-2">
          画像アップロード → キーワード自動生成 → 完了
        </p>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center justify-center space-x-4 mb-8">
        {[1, 2, 3].map((stepNum) => (
          <div key={stepNum} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= stepNum ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {step > stepNum ? <Check className="w-4 h-4" /> : stepNum}
            </div>
            {stepNum < 3 && <ArrowRight className="w-4 h-4 mx-2 text-gray-400" />}
          </div>
        ))}
      </div>

      {/* Step 1: 基本情報入力 */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: 基本情報入力</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">料理名 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="ガーリックシュリンプ"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">英語名</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData(prev => ({ ...prev, name_en: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Garlic Shrimp"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">カテゴリ *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">価格 *</label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="890"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">説明 *</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="プリプリのエビにガーリックバターソース"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">シェフコメント</label>
                <textarea
                  value={formData.chef_comment}
                  onChange={(e) => setFormData(prev => ({ ...prev, chef_comment: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="特製ガーリックソースが自慢の一品"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">おすすめポイント</label>
                <textarea
                  value={formData.recommendation}
                  onChange={(e) => setFormData(prev => ({ ...prev, recommendation: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={2}
                  placeholder="ディナーにおすすめ"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">ペアリング提案</label>
                <input
                  type="text"
                  value={formData.pairing_suggestion}
                  onChange={(e) => setFormData(prev => ({ ...prev, pairing_suggestion: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="白ワインやビールと一緒に"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">カロリー</label>
                <input
                  type="number"
                  value={formData.calories}
                  onChange={(e) => setFormData(prev => ({ ...prev, calories: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="350"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">材料</label>
                <input
                  type="text"
                  value={formData.ingredients.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    ingredients: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="エビ, ガーリック, バター, パセリ"
                />
                <p className="text-xs text-gray-500 mt-1">カンマ区切りで入力</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">アレルゲン</label>
                <input
                  type="text"
                  value={formData.allergens.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    allergens: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
                  }))}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="エビ, 乳製品"
                />
                <p className="text-xs text-gray-500 mt-1">カンマ区切りで入力</p>
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={!formData.name || !formData.category || !formData.description}
              >
                次へ <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: 画像アップロード */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 2: 料理画像アップロード</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              {previewImage ? (
                <div>
                  <img src={previewImage} alt="プレビュー" className="max-w-xs mx-auto rounded-lg shadow-md" />
                  <p className="text-sm text-gray-600 mt-2">画像が選択されました</p>
                </div>
              ) : (
                <div>
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">料理画像をアップロードしてください</p>
                </div>
              )}
              
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mt-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                戻る
              </Button>
              <Button
                onClick={generateKeywords}
                disabled={!formData.image || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                キーワード自動生成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: 結果確認 */}
      {step === 3 && generatedKeywords && (
        <Card>
          <CardHeader>
            <CardTitle>Step 3: 生成結果確認</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">料理情報</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>名前:</strong> {formData.name}</p>
                  <p><strong>英語名:</strong> {formData.name_en || '未設定'}</p>
                  <p><strong>カテゴリ:</strong> {formData.category}</p>
                  <p><strong>価格:</strong> ¥{formData.price}</p>
                  <p><strong>カロリー:</strong> {formData.calories || '未設定'}kcal</p>
                  <p><strong>説明:</strong> {formData.description}</p>
                  {formData.ingredients.length > 0 && (
                    <p><strong>材料:</strong> {formData.ingredients.join(', ')}</p>
                  )}
                  {formData.allergens.length > 0 && (
                    <p><strong>アレルゲン:</strong> {formData.allergens.join(', ')}</p>
                  )}
                </div>
              </div>
              
              <div>
                {previewImage && (
                  <img src={previewImage} alt="料理画像" className="w-full max-w-xs rounded-lg shadow-md" />
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">自動生成されたキーワード:</h4>
              <div className="flex flex-wrap gap-1 mb-4">
                {generatedKeywords.keywords.map((keyword, index) => (
                  <Badge key={index}>{keyword}</Badge>
                ))}
              </div>
              
              <p className="text-sm text-gray-600">
                信頼度: {Math.round(generatedKeywords.confidence * 100)}%
              </p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>
                戻る
              </Button>
              <Button
                onClick={createDishComplete}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                料理を作成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
