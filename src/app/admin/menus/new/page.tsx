'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Plus, X } from 'lucide-react'
import Link from 'next/link'

const menuSchema = z.object({
  name: z.string().min(1, 'メニュー名は必須です'),
  description: z.string().min(1, '説明は必須です'),
  category: z.string().min(1, 'カテゴリは必須です'),
  price: z.number().min(0, '価格は0以上である必要があります').optional(),
  ingredients: z.array(z.string()).default([]),
  allergens: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  imageUrls: z.array(z.string()).default([]),
})

type MenuFormData = z.infer<typeof menuSchema>

export default function NewMenuPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newIngredient, setNewIngredient] = useState('')
  const [newAllergen, setNewAllergen] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  const [newImageUrl, setNewImageUrl] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<MenuFormData>({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      ingredients: [],
      allergens: [],
      keywords: [],
      imageUrls: [],
    },
  })

  const ingredients = watch('ingredients')
  const allergens = watch('allergens')
  const keywords = watch('keywords')
  const imageUrls = watch('imageUrls')

  const addItem = (
    type: 'ingredients' | 'allergens' | 'keywords' | 'imageUrls',
    value: string,
    setter: (value: string) => void
  ) => {
    if (value.trim()) {
      const currentItems = watch(type)
      setValue(type, [...currentItems, value.trim()])
      setter('')
    }
  }

  const removeItem = (
    type: 'ingredients' | 'allergens' | 'keywords' | 'imageUrls',
    index: number
  ) => {
    const currentItems = watch(type)
    setValue(type, currentItems.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: MenuFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        router.push('/admin/menus')
      } else {
        const error = await response.json()
        console.error('Error creating menu:', error)
        alert('メニューの作成に失敗しました')
      }
    } catch (error) {
      console.error('Error creating menu:', error)
      alert('メニューの作成に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/admin/menus"
            className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">新規メニュー登録</h1>
            <p className="text-gray-600 mt-1">
              新しいメニューアイテムを追加します
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  メニュー名 *
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: カフェラテ"
                />
                {errors.name && (
                  <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  カテゴリ *
                </label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">カテゴリを選択</option>
                  <option value="ドリンク">ドリンク</option>
                  <option value="フード">フード</option>
                  <option value="デザート">デザート</option>
                  <option value="サイド">サイド</option>
                </select>
                {errors.category && (
                  <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  説明 *
                </label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="メニューの詳細説明を入力してください"
                />
                {errors.description && (
                  <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  価格 (円)
                </label>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 450"
                />
                {errors.price && (
                  <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              原材料
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="原材料を入力"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('ingredients', newIngredient, setNewIngredient)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addItem('ingredients', newIngredient, setNewIngredient)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  {ingredient}
                  <button
                    type="button"
                    onClick={() => removeItem('ingredients', index)}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Allergens */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              アレルゲン
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="アレルゲンを入力"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('allergens', newAllergen, setNewAllergen)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addItem('allergens', newAllergen, setNewAllergen)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {allergens.map((allergen, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
                >
                  {allergen}
                  <button
                    type="button"
                    onClick={() => removeItem('allergens', index)}
                    className="hover:bg-red-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              検索キーワード
            </h2>
            
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="検索キーワードを入力"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem('keywords', newKeyword, setNewKeyword)
                  }
                }}
              />
              <button
                type="button"
                onClick={() => addItem('keywords', newKeyword, setNewKeyword)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {keyword}
                  <button
                    type="button"
                    onClick={() => removeItem('keywords', index)}
                    className="hover:bg-green-200 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/menus"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '作成中...' : 'メニューを作成'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
