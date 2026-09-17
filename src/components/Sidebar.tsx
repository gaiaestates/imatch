'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import LogoutButton from './LogoutButton'

interface SidebarProps {
  userName?: string
  userId?: string
  avatarUrl?: string | null
}

export default function Sidebar({ userName, userId, avatarUrl }: SidebarProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function isActive(href: string, query?: Record<string, string>) {
    if (!query) {
      if (href === '/demandas') {
        return pathname === '/demandas' && !searchParams.get('minhas') && !searchParams.get('salvas')
      }
      return pathname === href || pathname.startsWith(href + '/')
    }
    if (pathname !== href.split('?')[0]) return false
    return Object.entries(query).every(([k, v]) => searchParams.get(k) === v)
  }

  const navItems: { href: string; label: string; query?: Record<string, string>; icon: React.ReactNode }[] = [
    {
      href: '/demandas',
      label: 'Demandas',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      ),
    },
    {
      href: '/demandas?minhas=1',
      label: 'Minhas demandas',
      query: { minhas: '1' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V19.5a2.25 2.25 0 002.25 2.25h.75" />
        </svg>
      ),
    },
    {
      href: '/demandas?salvas=1',
      label: 'Meus favoritos',
      query: { salvas: '1' },
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.562.562 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ),
    },
    {
      href: '/corretores',
      label: 'Corretores',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      href: '/perfil',
      label: 'Perfil',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
    {
      href: '/notificacoes',
      label: 'Notificações',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
      ),
    },
  ]

  return (
    <>
      {/* ── SIDEBAR DESKTOP ── */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 h-full w-56 bg-white border-r border-stone-200 z-20">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-100">
          <Link href="/demandas" className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </Link>
        </div>

        {/* CTA Nova demanda */}
        <div className="px-3 pt-4 pb-2">
          <Link href="/nova-demanda"
            className="flex items-center justify-center gap-2 w-full bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium py-2.5 rounded-xl transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nova demanda
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const active = isActive(item.href, item.query)
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                }`}>
                <span className={active ? 'text-emerald-700' : 'text-stone-400'}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer: usuário + logout */}
        <div className="px-3 py-4 border-t border-stone-100">
          {userName && userId && (
            <Link href="/perfil"
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-stone-50 transition-colors mb-1 group">
              <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                  : userName.charAt(0).toUpperCase()
                }
              </div>
              <span className="text-sm text-stone-600 truncate group-hover:text-emerald-700">{userName}</span>
            </Link>
          )}
          <div className="px-2">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* ── NAV MOBILE (bottom bar) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 z-20 flex">
        {navItems.map(item => {
          const active = isActive(item.href, item.query)
          return (
            <Link key={item.href} href={item.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[9px] font-medium transition-colors ${
                active ? 'text-emerald-700' : 'text-stone-400'
              }`}>
              <span>{item.icon}</span>
              <span>{item.label.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
