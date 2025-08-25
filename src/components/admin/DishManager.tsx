'use client'

import { useState, useEffect } from 'react'
import { Trash2, Eye, RefreshCw, AlertTriangle, Plus } from 'lucide-react'
import Link from 'next/link'

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
        : variant === 'destructive'
        ? 'bg-red-600 text-white hover:bg-red-700'
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
      : variant === 'destructive'
      ? 'bg-red-100 text-red-800'
      : 'bg-blue-100 text-blue-800'
  }`}>
    {children}
  </span>
)

interface Dish {
  id: string
  notion_id: string
  name: string
  name_en: string
  category: string
  price: number
  description: string
  keywords: string[]
  visual_keywords: string[]
  image_urls: string[]
  available: boolean
  created_at: string
  updated_at: string
}

export function DishManager() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const fetchDishes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dishes')
      const result = await response.json()
      
      if (result.success) {
        setDishes(result.dishes)
      } else {
        alert('❌ 料理一覧の取得に失敗しました')
      }
    } catch (error) {
      console.error('料理一覧取得エラー:', error)
      alert('❌ 料理一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const deleteDish = async (dish: Dish) => {
    if (deleting) return

    setDeleting(dish.id)
    try {
      const response = await fetch('/api/delete-dish', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dishId: dish.id,
          notionId: dish.notion_id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`✅ ${result.dish_name} を削除しました`)
        await fetchDishes() // 一覧を再取得
      } else {
        alert(`❌ 削除に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('削除エラー:', error)
      alert('❌ 削除に失敗しました')
    } finally {
      setDeleting(null)
      setDeleteConfirm(null)
    }
  }

  useEffect(() => {
    fetchDishes()
  }, [])

  const hasProblematicKeywords = (dish: Dish) => {
    const problematicKeywords = ['white', 'black', 'red', 'blue', 'green', 'yellow', '白い', '黒い', '赤い']
    const allKeywords = [...(dish.keywords || []), ...(dish.visual_keywords || [])]
    return allKeywords.some(keyword => 
      problematicKeywords.some(prob => keyword.toLowerCase().includes(prob.toLowerCase()))
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
        <span>料理一覧を読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🍽️ 料理管理</h1>
          <p className="text-gray-600 mt-2">
            登録済み料理の確認・削除ができます
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchDishes} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            更新
          </Button>
          <Link href="/admin/new-dish">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              新料理追加
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4">
        {dishes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500">登録済み料理がありません</p>
              <Link href="/admin/new-dish" className="inline-block mt-4">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  最初の料理を追加
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          dishes.map((dish) => (
            <Card key={dish.id} className={hasProblematicKeywords(dish) ? 'border-orange-200 bg-orange-50' : ''}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{dish.name}</h3>
                      {dish.name_en && (
                        <span className="text-sm text-gray-500">({dish.name_en})</span>
                      )}
                      <Badge>{dish.category}</Badge>
                      <Badge variant="secondary">¥{dish.price}</Badge>
                      {!dish.available && (
                        <Badge variant="destructive">販売停止</Badge>
                      )}
                      {hasProblematicKeywords(dish) && (
                        <Badge variant="destructive">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          要改善
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3">{dish.description}</p>
                    
                    <div className="space-y-2">
                      {dish.keywords && dish.keywords.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">キーワード: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dish.keywords.slice(0, 8).map((keyword, index) => (
                              <Badge key={index} variant="secondary">{keyword}</Badge>
                            ))}
                            {dish.keywords.length > 8 && (
                              <Badge variant="secondary">+{dish.keywords.length - 8}個</Badge>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {dish.visual_keywords && dish.visual_keywords.length > 0 && (
                        <div>
                          <span className="text-sm font-medium text-gray-700">ビジュアルキーワード: </span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {dish.visual_keywords.slice(0, 6).map((keyword, index) => (
                              <Badge key={index} variant="secondary">{keyword}</Badge>
                            ))}
                            {dish.visual_keywords.length > 6 && (
                              <Badge variant="secondary">+{dish.visual_keywords.length - 6}個</Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>作成: {new Date(dish.created_at).toLocaleDateString('ja-JP')}</span>
                      <span>更新: {new Date(dish.updated_at).toLocaleDateString('ja-JP')}</span>
                      <span>Notion ID: {dish.notion_id?.slice(0, 8)}...</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {dish.image_urls && dish.image_urls.length > 0 && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                        <img 
                          src={dish.image_urls[0]} 
                          alt={dish.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      {deleteConfirm === dish.id ? (
                        <div className="flex flex-col gap-1">
                          <Button
                            onClick={() => deleteDish(dish)}
                            disabled={deleting === dish.id}
                            variant="destructive"
                            className="text-xs px-2 py-1"
                          >
                            {deleting === dish.id ? '削除中...' : '本当に削除'}
                          </Button>
                          <Button
                            onClick={() => setDeleteConfirm(null)}
                            variant="outline"
                            className="text-xs px-2 py-1"
                          >
                            キャンセル
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setDeleteConfirm(dish.id)}
                          variant="destructive"
                          className="text-xs px-2 py-1"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          削除
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {hasProblematicKeywords && dishes.some(hasProblematicKeywords) && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <p className="font-medium text-orange-800">キーワード改善推奨</p>
                <p className="text-sm text-orange-700">
                  オレンジ色の料理は色のみのキーワードが含まれており、検索精度が低い可能性があります。
                  削除して /admin/new-dish で再作成することをお勧めします。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
