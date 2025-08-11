'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { Menu } from '@/types/menu'
import { formatPrice, formatDate } from '@/lib/utils'

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    fetchMenus()
  }, [filter])

  const fetchMenus = async () => {
    try {
      const params = new URLSearchParams()
      if (filter !== 'all') {
        params.append('active', filter === 'active' ? 'true' : 'false')
      }
      
      const response = await fetch(`/api/menus?${params}`)
      if (response.ok) {
        const data = await response.json()
        setMenus(data)
      }
    } catch (error) {
      console.error('Error fetching menus:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleMenuStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch('/api/menus', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          active: !currentStatus,
        }),
      })

      if (response.ok) {
        fetchMenus()
      }
    } catch (error) {
      console.error('Error updating menu status:', error)
    }
  }

  const deleteMenu = async (id: string) => {
    if (!confirm('このメニューを削除してもよろしいですか？')) {
      return
    }

    try {
      const response = await fetch(`/api/menus?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchMenus()
      }
    } catch (error) {
      console.error('Error deleting menu:', error)
    }
  }

  const filteredMenus = menus.filter(menu => {
    if (filter === 'active') return menu.active
    if (filter === 'inactive') return !menu.active
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">メニュー管理</h1>
            <p className="text-gray-600 mt-1">
              登録済みメニューの一覧と管理
            </p>
          </div>
          <Link
            href="/admin/menus/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            新規メニュー追加
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              すべて ({menus.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'active'
                  ? 'bg-green-100 text-green-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              有効 ({menus.filter(m => m.active).length})
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === 'inactive'
                  ? 'bg-red-100 text-red-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              無効 ({menus.filter(m => !m.active).length})
            </button>
          </div>
        </div>

        {/* Menu List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              読み込み中...
            </div>
          ) : filteredMenus.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              メニューが見つかりません
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      メニュー名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      価格
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ステータス
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      更新日
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMenus.map((menu) => (
                    <tr key={menu.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {menu.name}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {menu.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {menu.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {menu.price ? formatPrice(menu.price) : '価格未設定'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            menu.active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {menu.active ? '有効' : '無効'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(new Date(menu.updatedAt))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleMenuStatus(menu.id, menu.active)}
                            className={`p-1 rounded hover:bg-gray-100 ${
                              menu.active ? 'text-red-600' : 'text-green-600'
                            }`}
                            title={menu.active ? '無効にする' : '有効にする'}
                          >
                            {menu.active ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            className="p-1 rounded hover:bg-gray-100 text-blue-600"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteMenu(menu.id)}
                            className="p-1 rounded hover:bg-gray-100 text-red-600"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
