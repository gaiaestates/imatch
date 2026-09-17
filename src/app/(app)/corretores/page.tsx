'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function CorretoresPage() {
  const [brokers, setBrokers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, creci, imobiliaria, autonomo, avatar_url')
        .order('full_name')
        .limit(500)
      setBrokers(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const filtered = brokers.filter(b =>
    !search || b.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.imobiliaria?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-stone-700">Corretores</h1>
        {!loading && (
          <span className="text-sm text-stone-400">
            {filtered.length} encontrado{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="mb-5">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome ou imobiliária..."
          className="w-full border border-stone-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-stone-400 text-center py-16">Nenhum corretor encontrado.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(b => (
            <Link key={b.id} href={`/corretores/${b.id}`}
              className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md hover:border-stone-300 transition-all flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-bold shrink-0 overflow-hidden border border-stone-100">
                {b.avatar_url
                  ? <img src={b.avatar_url} alt={b.full_name} className="w-full h-full object-cover" />
                  : <span>{b.full_name?.charAt(0).toUpperCase() ?? '?'}</span>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-blue-900 truncate">{b.full_name}</p>
                <p className="text-xs font-medium text-blue-700 truncate">
                  {b.autonomo ? 'Autônomo' : (b.imobiliaria || '')}
                </p>
                {b.creci && (
                  <p className="text-xs text-stone-300">CRECI {b.creci}</p>
                )}
              </div>
              <span className="text-xs text-stone-300 group-hover:text-emerald-500 shrink-0">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
