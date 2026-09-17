import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AvatarPopup from '@/components/AvatarPopup'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      <Suspense>
        <Sidebar
          userName={profile?.full_name ?? ''}
          userId={user.id}
          avatarUrl={profile?.avatar_url ?? null}
        />
      </Suspense>
      <AvatarPopup hasAvatar={!!profile?.avatar_url} />
      <div className="md:ml-56 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}
