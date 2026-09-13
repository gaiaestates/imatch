'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  demandId: string
  lastJob?: { status: string; finished_at?: string; total_found?: number } | null
}

export default function MatchTrigger({ demandId, lastJob }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ total: number } | null>(null)
  const router = useRouter()

  const isRunning = lastJob?.status === 'running'

  async function handleClick() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`/api/match/${demandId}`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao buscar matches')
      setResult({ total: data.total ?? 0 })
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <button
        onClick={handleClick}
        disabled={loading || isRunning}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 text-white text-sm font-medium
          hover:bg-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading || isRunning ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Buscando…
          </>
        ) : (
          <>
            🔍 Buscar matches
          </>
        )}
      </button>

      {result && (
        <span className="text-xs text-emerald-700 font-medium">
          {result.total === 0 ? 'Nenhum match encontrado.' : `${result.total} match${result.total !== 1 ? 'es' : ''} encontrado${result.total !== 1 ? 's' : ''}!`}
        </span>
      )}
      {error && (
        <span className="text-xs text-red-600">{error}</span>
      )}
    </div>
  )
}
