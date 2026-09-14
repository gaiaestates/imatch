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

  const toggle = useCallback((key: string) => {
    push(key, get(key) ? '' : '1')
  }, [get, push])

  const clear = () => router.push(pathname)
  const hasFilters = sp.size > 0

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mb-4">

      {/* Linha 1: controles sempre visíveis */}
      <div className="flex flex-wrap gap-2 items-center">

        {/* Finalidade */}
        <div className="flex rounded-lg border border-stone-200 overflow-hidden">
          {[['', 'Todos'], ['compra', 'Compra'], ['aluguel', 'Aluguel']].map(([v, label]) => (
            <button key={v} type="button"
              onClick={() => push('finalidade', v)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                get('finalidade') === v
                  ? 'bg-emerald-700 text-white'
                  : 'text-stone-600 hover:bg-stone-50'
              }`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tipo */}
        <select value={get('tipo')} onChange={e => push('tipo', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
          <option value="">Tipo de imóvel</option>
          {TIPOS_FLAT.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        {/* Quartos */}
        <select value={get('quartos')} onChange={e => push('quartos', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
          <option value="">Quartos</option>
          {[1,2,3,4,5].map(n => <option key={n} value={String(n)}>{n}+</option>)}
        </select>

        {/* Bairro */}
        <input type="text" placeholder="Bairro..." value={get('bairro')}
          onChange={e => push('bairro', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-28" />

        {/* Favoritos toggle */}
        <button type="button"
          onClick={() => toggle('salvas')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            get('salvas')
              ? 'bg-amber-50 border-amber-200 text-amber-600'
              : 'border-stone-200 text-stone-500 hover:bg-stone-50'
          }`}>
          {get('salvas') ? '★ Favoritos' : '☆ Favoritos'}
        </button>

        {/* Ordem */}
        <select value={get('ordem')} onChange={e => push('ordem', e.target.value)}
          className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 ml-auto">
          <option value="">Mais recente</option>
          <option value="antigo">Mais antigo</option>
          <option value="valor-asc">Menor valor</option>
          <option value="valor-desc">Maior valor</option>
        </select>

        <button type="button" onClick={() => setExpanded(e => !e)}
          className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1">
          {expanded ? '▲' : '▼'} filtros
        </button>
      </div>

      {/* Linha 2: filtros expandidos */}
      {expanded && (
        <div className="flex flex-wrap gap-3 items-end mt-3 pt-3 border-t border-stone-100">

          {/* Cidade */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Cidade</label>
            <input type="text" placeholder="São Paulo..." value={get('cidade')}
              onChange={e => push('cidade', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-36" />
          </div>

          {/* Período */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Período</label>
            <select value={get('periodo')} onChange={e => push('periodo', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="">Qualquer data</option>
              <option value="mes">Este mês</option>
              <option value="mes-passado">Mês passado</option>
              <option value="3meses">Últimos 3 meses</option>
              <option value="6meses">Últimos 6 meses</option>
              <option value="ano">Este ano</option>
            </select>
          </div>

          {/* Valor máx */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Valor máx. (R$)</label>
            <input type="number" step="50000" placeholder="2.000.000" value={get('valor_max')}
              onChange={e => push('valor_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-32" />
          </div>

          {/* Área mín */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Área mín. (m²)</label>
            <input type="number" step="10" placeholder="80" value={get('area_min')}
              onChange={e => push('area_min', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-24" />
          </div>

          {/* Valor/m² máx */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">R$/m² máx.</label>
            <input type="number" step="1000" placeholder="25.000" value={get('vpm2_max')}
              onChange={e => push('vpm2_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-28" />
          </div>

          {/* Cond. máx */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Cond. máx. (R$)</label>
            <input type="number" step="500" placeholder="5.000" value={get('cond_max')}
              onChange={e => push('cond_max', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-400 w-28" />
          </div>

          {/* Vagas */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-stone-400">Vagas mín.</label>
            <select value={get('vagas')} onChange={e => push('vagas', e.target.value)}
              className="text-xs border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white text-stone-700 focus:outline-none focus:ring-1 focus:ring-emerald-400">
              <option value="">Qualquer</option>
              {[1,2,3,4].map(n => <option key={n} value={String(n)}>{n}+</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Rodapé */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-50">
        <span className="text-xs text-stone-400">
          {total} demanda{total !== 1 ? 's' : ''} encontrada{total !== 1 ? 's' : ''}
        </span>
        {hasFilters && (
          <button type="button" onClick={clear} className="text-xs text-red-500 hover:text-red-700">
            Limpar filtros ×
          </button>
        )}
      </div>
    </div>
  )
}
