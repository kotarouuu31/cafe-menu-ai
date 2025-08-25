import { DishManager } from '@/components/admin/DishManager'
import { NoSSR } from '@/components/NoSSR'

export default function DishesPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <NoSSR fallback={
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      }>
        <DishManager />
      </NoSSR>
    </div>
  )
}
