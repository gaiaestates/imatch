'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function DemandActions({ demandId }: { demandId: string }) {
  const [confirm, setConfirm] = useState<'atendida' | 'excluida' | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleAction(status: 'atendida' | 'excluida') {
    setLoading(true)
    await supabase.from('demands').update({ status }).eq('id', demandId)
    router.push('/demandas?minhas=1')
    router.refresh()
  }

  if (confirm) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-stone-600">
          {confirm === 'atendida' ? 'Marcar como atendida?' : 'Confirmar exclusão?'}
        </span>
        <button onClick={() => handleAction(confirm)} disabled={loading}
          className={`text-sm font-medium text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 ${
            confirm === 'atendida' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'
          }`}>
          {loading ? '...' : 'Confirmar'}
        </button>
        <button onClick={() => setConfirm(null)} className="text-sm text-stone-400 hover:text-stone-600">
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={() => setConfirm('atendida')}
        className="text-sm font-medium text-emerald-700 border border-emerald-300 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors">
        ✓ Atendida
      </button>
      <button onClick={() => setConfirm('excluida')}
        className="text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
        Excluir
      </button>
    </div>
  )
}
