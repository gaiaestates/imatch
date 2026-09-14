import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      <Suspense>
        <Sidebar userName={profile?.full_name ?? ''} userId={user.id} />
      </Suspense>

      {/* Conteúdo principal — offset do sidebar no desktop, padding bottom no mobile */}
      <div className="md:ml-56 pb-20 md:pb-0">
        {children}
      </div>
    </div>
  )
}
