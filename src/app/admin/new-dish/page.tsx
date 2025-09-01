import { NewDishWizard } from '@/components/admin/NewDishWizard'
import { AdminLayout } from '@/components/layout/AdminLayout'

export default function NewDishPage() {
  return (
    <AdminLayout 
      title="新しい料理を追加" 
      description="Vision APIを使って自動でキーワードを生成します"
    >
      <NewDishWizard />
    </AdminLayout>
  )
}
