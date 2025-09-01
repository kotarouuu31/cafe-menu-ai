import { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft, Settings, Plus, List } from 'lucide-react'

interface AdminLayoutProps {
  children: ReactNode
  title: string
  description?: string
  backHref?: string
  actions?: ReactNode
}

export function AdminLayout({ 
  children, 
  title, 
  description, 
  backHref = '/admin',
  actions 
}: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href={backHref}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                戻る
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                {description && (
                  <p className="text-gray-600 mt-1">{description}</p>
                )}
              </div>
            </div>
            {actions && (
              <div className="flex items-center gap-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex space-x-8">
            <NavLink href="/admin/dishes" icon={List}>
              料理管理
            </NavLink>
            <NavLink href="/admin/new-dish" icon={Plus}>
              新規追加
            </NavLink>
            <NavLink href="/admin/keywords" icon={Settings}>
              キーワード管理
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

interface NavLinkProps {
  href: string
  icon: React.ComponentType<{ className?: string }>
  children: ReactNode
}

function NavLink({ href, icon: Icon, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-4 text-sm font-medium text-gray-600 hover:text-blue-600 hover:border-b-2 hover:border-blue-600 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {children}
    </Link>
  )
}
