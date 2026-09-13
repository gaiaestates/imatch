import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'

export default async function DemandasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: demands } = await supabase
    .from('demands')
    .select(`
      id, finalidade, tipo_imovel, cidade, estado,
      quartos_min, valor_min, valor_max, status, created_at,
      profiles(full_name)
    `)
    .eq('status', 'ativa')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-stone-500 hidden sm:block">
              {profile?.full_name}
            </span>
            <Link
              href="/nova-demanda"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              + Nova demanda
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-medium text-stone-800">Demandas ativas</h2>
            <p className="text-sm text-stone-500 mt-0.5">
              {demands?.length ?? 0} demanda{(demands?.length ?? 0) !== 1 ? 's' : ''} encontrada{(demands?.length ?? 0) !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {(!demands || demands.length === 0) ? (
          <div className="text-center py-20">
            <p className="text-stone-400 text-lg mb-2">Nenhuma demanda ativa ainda.</p>
            <p className="text-stone-400 text-sm mb-6">Seja o primeiro a cadastrar uma demanda!</p>
            <Link
              href="/nova-demanda"
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
            >
              Cadastrar demanda
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demands.map((d: any) => (
              <Link
                key={d.id}
                href={`/demandas/${d.id}`}
                className="bg-white rounded-xl border border-stone-200 p-4 hover:shadow-md transition-shadow block"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    d.finalidade === 'compra'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {d.finalidade === 'compra' ? 'Compra' : 'Aluguel'}
                  </span>
                  <span className="text-xs text-stone-400">
                    {new Date(d.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <h3 className="font-medium text-stone-800 mb-1 capitalize">
                  {d.tipo_imovel}
                </h3>

                {d.cidade && (
                  <p className="text-sm text-stone-500 mb-2">
                    📍 {d.cidade}{d.estado ? `, ${d.estado}` : ''}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 text-xs text-stone-600">
                  {d.quartos_min && (
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">
                      {d.quartos_min}+ quartos
                    </span>
                  )}
                  {(d.valor_min || d.valor_max) && (
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">
                      {d.valor_min
                        ? `R$ ${(d.valor_min / 1000).toFixed(0)}k`
                        : '–'
                      }
                      {' – '}
                      {d.valor_max
                        ? `R$ ${(d.valor_max / 1000).toFixed(0)}k`
                        : '–'
                      }
                    </span>
                  )}
                </div>

                {d.profiles && (
                  <p className="text-xs text-stone-400 mt-3 pt-3 border-t border-stone-100">
                    Por {(d.profiles as any).full_name}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
