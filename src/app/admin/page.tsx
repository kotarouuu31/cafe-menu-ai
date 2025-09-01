import Link from 'next/link'
import { Settings, Menu, Plus, BarChart3, Camera, Search } from 'lucide-react'

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cafe Menu AI 管理画面
          </h1>
          <p className="text-gray-600">
            メニュー管理とAI画像解析システムの設定
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/dishes"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 rounded-lg p-3 group-hover:bg-blue-200 transition-colors">
                <Menu className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                料理管理
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Vision API対応の料理データ管理・編集・削除
            </p>
          </Link>

          <Link
            href="/admin/new-dish"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="bg-green-100 rounded-lg p-3 group-hover:bg-green-200 transition-colors">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                新しい料理を追加
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              Vision APIで自動キーワード生成して料理を追加
            </p>
          </Link>

          <Link
            href="/"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 rounded-lg p-3 group-hover:bg-purple-200 transition-colors">
                <Camera className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                AI画像解析テスト
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              メニュー撮影でAI画像解析をテスト
            </p>
          </Link>

          <Link
            href="/admin/keywords"
            className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 rounded-lg p-3 group-hover:bg-orange-200 transition-colors">
                <Search className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 ml-3">
                キーワード管理
              </h3>
            </div>
            <p className="text-gray-600 text-sm">
              料理のキーワードを一括管理・最適化
            </p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            最近の活動
          </h2>
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>システム統計は近日実装予定です</p>
          </div>
        </div>
      </div>
    </div>
  )
}
