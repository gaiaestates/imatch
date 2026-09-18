'use client'

import { useState } from 'react'

interface Props {
  userId: string
  creci: string
  currentStatus: string
  verificadoEm: string | null
}

export default function CreciActions({ userId, creci, currentStatus, verificadoEm }: Props) {
  const [status, setStatus] = useState(currentStatus)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const cofecUrl = `https://www.cofeci.gov.br/portal/pesquisa-corretor?creci=${encodeURIComponent(creci)}`

  async function verificarAutomatico() {
    setLoading(true)
    setMsg(null)
    try {
      const res = await fetch('/api/creci/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, creci }),
      })
      const data = await res.json()
      setStatus(data.status)
      setMsg(data.status === 'erro' ? 'COFECI não respondeu — verifique manualmente.' : null)
    } catch {
      setMsg('Erro ao consultar.')
    } finally {
      setLoading(false)
    }
  }

  async function definirManual(novoStatus: string) {
    setLoading(true)
    setMsg(null)
    try {
      await fetch('/api/creci/check', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, status: novoStatus }),
      })
      setStatus(novoStatus)
    } catch {
      setMsg('Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  const fmtData = verificadoEm
    ? new Date(verificadoEm).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="text-right space-y-1.5">
      <p className="text-xs text-stone-400 font-medium uppercase tracking-wide">Admin — CRECI</p>

      <div className="flex gap-1.5 justify-end flex-wrap">
        <button
          onClick={verificarAutomatico}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 hover:border-emerald-400 hover:text-emerald-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Verificando…' : '🔍 Re-verificar'}
        </button>
        <a
          href={cofecUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-2.5 py-1 rounded-lg border border-stone-200 text-stone-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          🔗 COFECI
        </a>
      </div>

      <div className="flex gap-1 justify-end">
        <button
          onClick={() => definirManual('ativo')}
          disabled={loading || status === 'ativo'}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
            status === 'ativo'
              ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
              : 'border-stone-200 text-stone-500 hover:border-emerald-400 hover:text-emerald-700'
          }`}
        >
          ✓ Ativo
        </button>
        <button
          onClick={() => definirManual('inativo')}
          disabled={loading || status === 'inativo'}
          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors disabled:opacity-40 ${
            status === 'inativo'
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-stone-200 text-stone-500 hover:border-red-400 hover:text-red-600'
          }`}
        >
          ✗ Inativo
        </button>
      </div>

      {fmtData && (
        <p className="text-xs text-stone-300">Última verificação: {fmtData}</p>
      )}
      {msg && <p className="text-xs text-amber-600">{msg}</p>}
    </div>
  )
}
