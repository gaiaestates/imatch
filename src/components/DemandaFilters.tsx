'use client'

import { useState, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const TIPOS_FLAT = [
  'Apartamento', 'Casa', 'Casa em Condomínio', 'Cobertura', 'Studio', 'Kitnet', 'Flat', 'Loft',
  'Sala Comercial', 'Loja', 'Galpão', 'Prédio Comercial',
  'Terreno Residencial', 'Terreno Comercial', 'Chácara', 'Sítio', 'Fazenda',
]

export default function DemandaFilters({ total }: { total: number }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()

  const [expanded, setExpanded] = useState(false)

  const get = (k: string) => sp.get(k) ?? ''

  const push = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(sp.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }, [sp, pathname, router])

  const clear = () => router.push(pathname)

  const hasFilters = sp.size > 0

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">
      {/* Linha principal (sempre visível) */}
      <div className="flex flex-wrap gap-3 items-end">

        {/* Finalidade */}
        <div className="flex gap-1">
          {['', 'compra', 'aluguel'].map(v => (
            <button key={v} type="button"
              onClick={() => push('finalidade', v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                get('finalidade') === v
                  ? 'bg-emerald-700 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>
              {v === '' ? 'Todos' : v === 'compra' ? 'Compra' : 'Aluguel'}
            </button>
          ))}
        </div>

        {/* Tipo */}
        <select
          value={get('tipo')}
          onChange={e => push('tipo', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <option value="">Todos os tipos</option>
          {TIPOS_FLAT.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Quartos */}
        <select
          value={get('quartos')}
          onChange={e => push('quartos', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
        >
          <option value="">Quartos (mín.)</option>
          {[1,2,3,4,5].map(n => <option key={n} value={String(n)}>{n}+</option>)}
        </select>

        {/* Bairro */}
        <input
          type="text"
          placeholder="Bairro..."
          value={get('bairro')}
          onChange={e => push('bairro', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-32"
        />

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="text-xs text-stone-500 hover:text-stone-800 ml-auto flex items-center gap-1"
        >
          {expanded ? '▲ Menos filtros' : '▼ Mais filtros'}
        </button>
      </div>

      {/* Filtros expandidos */}
      {expanded && (
        <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-stone-100">

          {/* Cidade */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Cidade</label>
            <input
              type="text"
              placeholder="São Paulo..."
              value={get('cidade')}
              onChange={e => push('cidade', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-36"
            />
          </div>

          {/* Valor max */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Valor máx. (R$)</label>
            <input
              type="number"
              step="50000"
              placeholder="2.000.000"
              value={get('valor_max')}
              onChange={e => push('valor_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-32"
            />
          </div>

          {/* Área mín */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Área mín. (m²)</label>
            <input
              type="number"
              step="10"
              placeholder="80"
              value={get('area_min')}
              onChange={e => push('area_min', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-24"
            />
          </div>

          {/* Valor/m² máx */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Valor/m² máx. (R$)</label>
            <input
              type="number"
              step="1000"
              placeholder="25.000"
              value={get('vpm2_max')}
              onChange={e => push('vpm2_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-28"
            />
          </div>

          {/* Cond. máx */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Condomínio máx. (R$)</label>
            <input
              type="number"
              step="500"
              placeholder="5.000"
              value={get('cond_max')}
              onChange={e => push('cond_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-28"
            />
          </div>

          {/* Vagas */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Vagas mín.</label>
            <select
              value={get('vagas')}
              onChange={e => push('vagas', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              <option value="">Qualquer</option>
              {[1,2,3,4].map(n => <option key={n} value={String(n)}>{n}+</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Rodapé: resultado + limpar */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
        <span className="text-xs text-stone-400">
          {total} demanda{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
        </span>
        {hasFilters && (
          <button type="button" onClick={clear}
            className="text-xs text-red-500 hover:text-red-700">
            Limpar filtros ×
          </button>
        )}
      </div>
    </div>
  )
}
