'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutGrid, BarChart2, FileText, Settings, LogOut,FileEdit } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'
import { User } from '@/types'

const NAV_ITEMS = [
  { href: '/dashboard/board',     label: 'Board',     icon: LayoutGrid },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/dashboard/resumes',   label: 'Resumes',   icon: FileText },
  { href: '/dashboard/resume-builder', label: 'Resume AI', icon: FileEdit },
  { href: '/dashboard/settings',  label: 'Settings',  icon: Settings },
]

export default function Sidebar({ user }: { user: User | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="w-[200px] min-w-[200px] bg-white border-r border-gray-100 flex flex-col">

      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-100">
        <div className="w-6 h-6 rounded-full bg-[#534AB7]" />
        <span className="text-sm font-medium text-gray-900">PlaceHire</span>
        {user?.plan === 'pro' && (
          <span className="ml-auto text-[10px] bg-[#EEEDFE] text-[#534AB7] px-2 py-0.5 rounded-full font-medium">
            Pro
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2.5 px-4 py-2 text-[13px] transition-colors',
              pathname.startsWith(href)
                ? 'text-[#534AB7] bg-[#EEEDFE] font-medium'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            )}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-gray-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[10px] font-medium text-[#534AB7]">
              {getInitials(user?.full_name ?? user?.email ?? 'U')}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-900 truncate">
              {user?.full_name ?? 'User'}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 text-[12px] text-gray-400 hover:text-gray-600 transition-colors"
        >
          <LogOut size={12} />
          Sign out
        </button>
      </div>
    </aside>
  )
}