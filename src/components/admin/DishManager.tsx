'use client'

import { useState, useEffect } from 'react'
import { Trash2, RefreshCw, Plus, AlertTriangle, Eye } from 'lucide-react'

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
  notion_id: string
  name: string
  name_en?: string
  category: string
  price: number
  description: string
  keywords: string[]
  visual_keywords: string[]
  available: boolean
  updated_at: string
}

interface DeleteConfirmDialog {
  isOpen: boolean
  dish: Dish | null
}

export function DishManager() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<DeleteConfirmDialog>({ isOpen: false, dish: null })

  const fetchDishes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/menus')
      const data = await response.json()
      
      if (data.success) {
        // Supabaseデータの場合は直接使用、フォールバックの場合は変換
        const dishes = data.menus.map((dish: any) => ({
          notion_id: dish.notion_id || dish.id,
          name: dish.name,
          name_en: dish.name_en,
          category: dish.category,
          price: dish.price,
          description: dish.description,
          keywords: Array.isArray(dish.keywords) ? dish.keywords : [],
          visual_keywords: Array.isArray(dish.visual_keywords) ? dish.visual_keywords : [],
          available: dish.available ?? dish.active ?? true,
          updated_at: dish.updated_at || dish.updatedAt || new Date().toISOString()
        }))
        setDishes(dishes)
      } else {
        alert('❌ 料理データの取得に失敗しました')
      }
    } catch (error) {
      console.error('料理取得エラー:', error)
      alert('❌ 料理データの取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (dish: Dish) => {
    setIsDeleting(dish.notion_id)
    try {
      const response = await fetch('/api/delete-dish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notionId: dish.notion_id,
          dishName: dish.name
        })
      })

      const result = await response.json()
      
      if (result.success) {
        alert(`✅ ${dish.name} を削除しました`)
        setDeleteDialog({ isOpen: false, dish: null })
        fetchDishes() // リフレッシュ
      } else {
        alert(`❌ 削除に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('削除エラー:', error)
      alert('❌ 削除に失敗しました')
    } finally {
      setIsDeleting(null)
    }
  }

  const openDeleteDialog = (dish: Dish) => {
    setDeleteDialog({ isOpen: true, dish })
  }

  const closeDeleteDialog = () => {
    setDeleteDialog({ isOpen: false, dish: null })
  }

  useEffect(() => {
    fetchDishes()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🍽️ 料理管理</h1>
          <p className="text-gray-600 mt-2">
            登録済み料理の確認・削除ができます
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button onClick={fetchDishes} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            更新
          </Button>
          <Button onClick={() => window.location.href = '/admin/new-dish'}>
            <Plus className="w-4 h-4 mr-2" />
            新料理追加
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
            <p className="text-gray-600">料理データを読み込み中...</p>
          </CardContent>
        </Card>
      ) : dishes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-600 mb-4">登録済みの料理がありません</p>
            <Button onClick={() => window.location.href = '/admin/new-dish'}>
              <Plus className="w-4 h-4 mr-2" />
              最初の料理を追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dishes.map((dish) => (
            <Card key={dish.notion_id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{dish.name}</h3>
                      {dish.name_en && (
                        <span className="text-gray-500 text-sm">({dish.name_en})</span>
                      )}
                      <Badge>{dish.category}</Badge>
                      <Badge variant={dish.available ? 'default' : 'destructive'}>
                        {dish.available ? '提供中' : '停止中'}
                      </Badge>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{dish.description}</p>
                    <p className="text-lg font-semibold text-blue-600 mb-3">¥{dish.price}</p>
                    
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-medium text-gray-700">キーワード:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dish.keywords?.length > 0 ? (
                            dish.keywords.slice(0, 8).map((keyword, idx) => (
                              <Badge key={idx} variant="secondary">{keyword}</Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">キーワードなし</span>
                          )}
                          {dish.keywords?.length > 8 && (
                            <Badge variant="secondary">+{dish.keywords.length - 8}個</Badge>
                          )}
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">ビジュアルキーワード:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {dish.visual_keywords?.length > 0 ? (
                            dish.visual_keywords.slice(0, 5).map((keyword, idx) => (
                              <Badge key={idx} variant="secondary">{keyword}</Badge>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">ビジュアルキーワードなし</span>
                          )}
                          {dish.visual_keywords?.length > 5 && (
                            <Badge variant="secondary">+{dish.visual_keywords.length - 5}個</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <p className="text-xs text-gray-400 mt-3">
                      更新: {new Date(dish.updated_at).toLocaleString('ja-JP')}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="destructive"
                      onClick={() => openDeleteDialog(dish)}
                      disabled={isDeleting === dish.notion_id}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 削除確認ダイアログ */}
      {deleteDialog.isOpen && deleteDialog.dish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                料理削除の確認
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                以下の料理を削除しますか？この操作は取り消せません。
              </p>
              
              <div className="bg-gray-50 p-3 rounded-md">
                <p className="font-semibold">{deleteDialog.dish.name}</p>
                <p className="text-sm text-gray-600">{deleteDialog.dish.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Notion ID: {deleteDialog.dish.notion_id}
                </p>
              </div>
              
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-md">
                <p className="text-sm text-yellow-800">
                  <strong>削除される場所:</strong>
                  <br />• Supabaseデータベース
                  <br />• Notion（アーカイブ）
                </p>
              </div>
              
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={closeDeleteDialog}>
                  キャンセル
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(deleteDialog.dish!)}
                  disabled={isDeleting === deleteDialog.dish.notion_id}
                >
                  {isDeleting === deleteDialog.dish.notion_id ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  削除する
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
