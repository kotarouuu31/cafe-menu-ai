import { DishManager } from '@/components/admin/DishManager'
import { AdminLayout } from '@/components/layout/AdminLayout'

export default function DishesPage() {
  return (
    <AdminLayout 
      title="料理管理" 
      description="登録済みの料理を管理・編集できます"
    >
      <DishManager />
    </AdminLayout>
  )
}
