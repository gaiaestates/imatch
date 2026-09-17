import Link from 'next/link'

export default function NovaDemandaLanding() {
  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="mb-8">
        <Link href="/demandas" className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700">
          ← Demandas
        </Link>
      </div>

      <h1 className="text-2xl font-semibold text-stone-800 mb-2">Nova demanda</h1>
      <p className="text-stone-500 text-sm mb-8">Como prefere cadastrar a demanda?</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/nova-demanda/formulario"
          className="group relative bg-white border-2 border-emerald-500 rounded-2xl p-6 hover:bg-emerald-50 transition-colors block">
          <div className="absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Recomendado
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <path d="M9 12h6M9 16h4"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-stone-800 mb-1">Preencher formulário</h2>
          <p className="text-sm text-stone-500">Campos estruturados com prioridades, faixas de valor e amenidades.</p>
        </Link>

        <Link href="/nova-demanda/formulario?ia=1"
          className="group bg-white border-2 border-stone-200 rounded-2xl p-6 hover:border-stone-400 transition-colors block">
          <div className="w-10 h-10 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center mb-4">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-stone-800 mb-1">Descrever em texto</h2>
          <p className="text-sm text-stone-500">A IA extrai as informações do texto e preenche o formulário automaticamente.</p>
        </Link>
      </div>
    </div>
  )
}
