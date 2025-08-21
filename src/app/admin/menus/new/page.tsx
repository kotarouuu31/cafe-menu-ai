'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { ArrayInput, FormField, LoadingButton } from '@/components/ui/form-components'
import { MENU_CATEGORIES } from '@/lib/menu-utils'

const menuSchema = z.object({
  name: z.string().min(1, 'メニュー名は必須です'),
  description: z.string().min(1, '説明は必須です'),
  category: z.string().min(1, 'カテゴリは必須です'),
  price: z.number().min(0, '価格は0以上である必要があります').optional(),
  ingredients: z.array(z.string()).optional().default([]),
  allergens: z.array(z.string()).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  imageUrls: z.array(z.string()).optional().default([]),
})

type MenuFormData = z.infer<typeof menuSchema>

export default function NewMenuPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 配列入力の状態管理は ArrayInput コンポーネント内で処理

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(menuSchema),
    defaultValues: {
      ingredients: [],
      allergens: [],
      keywords: [],
      imageUrls: [],
    },
  })

  const ingredients = watch('ingredients') || []
  const watchedData = watch()
  const allergens = watchedData.allergens || []
  const keywords = watchedData.keywords || []

  const addItem = (type: 'ingredients' | 'allergens' | 'keywords' | 'imageUrls', value: string) => {
    const currentItems = watch(type) || []
    setValue(type, [...currentItems, value])
  }

  const removeItem = (type: 'ingredients' | 'allergens' | 'keywords' | 'imageUrls', index: number) => {
    const currentItems = watch(type) || []
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
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              基本情報
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField label="メニュー名" required error={errors.name?.message}>
                <input
                  {...register('name')}
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: カフェラテ"
                />
              </FormField>

              <FormField label="カテゴリ" required error={errors.category?.message}>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">カテゴリを選択</option>
                  {MENU_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </FormField>

              <div className="md:col-span-2">
                <FormField label="説明" required error={errors.description?.message}>
                  <textarea
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="メニューの詳細説明を入力してください"
                  />
                </FormField>
              </div>

              <FormField label="価格 (円)" error={errors.price?.message}>
                <input
                  {...register('price', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: 450"
                />
              </FormField>
            </div>
          </div>

          <ArrayInput
            label="原材料"
            placeholder="原材料を入力"
            items={ingredients}
            onAdd={(item) => addItem('ingredients', item)}
            onRemove={(index) => removeItem('ingredients', index)}
            colorScheme="blue"
          />

          <ArrayInput
            label="アレルゲン"
            placeholder="アレルゲンを入力"
            items={allergens}
            onAdd={(item) => addItem('allergens', item)}
            onRemove={(index) => removeItem('allergens', index)}
            colorScheme="red"
          />

          <ArrayInput
            label="検索キーワード"
            placeholder="検索キーワードを入力"
            items={keywords}
            onAdd={(item) => addItem('keywords', item)}
            onRemove={(index) => removeItem('keywords', index)}
            colorScheme="green"
          />

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link
              href="/admin/menus"
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </Link>
            <LoadingButton
              type="submit"
              loading={isSubmitting}
            >
              メニューを作成
            </LoadingButton>
          </div>
        </form>
      </div>
    </div>
  )
}
