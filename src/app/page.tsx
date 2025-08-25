import { NoSSR } from '@/components/NoSSR'
import { CafeMenuApp } from '@/components/CafeMenuApp'

export default function Home() {
  return (
    <NoSSR fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
              <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded animate-pulse"></div>
                Cafe Menu AI
              </h1>
              <p className="text-center text-blue-100 mt-2">
                読み込み中...
              </p>
            </div>
            <div className="p-6">
              <div className="text-center space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="w-16 h-16 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded mx-auto mb-4 animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                    <div className="h-12 bg-gray-200 rounded animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <CafeMenuApp />
    </NoSSR>
  )
}
