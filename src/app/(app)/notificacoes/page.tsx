export default function NotificacoesPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-xl font-semibold text-stone-800 mb-1">Notificações</h1>
      <p className="text-sm text-stone-400 mb-8">Em breve você será notificado quando houver novos matches para suas demandas.</p>
      <div className="bg-white rounded-xl border border-stone-200 p-10 text-center">
        <div className="text-4xl mb-3">🔔</div>
        <p className="text-stone-400 text-sm">Nenhuma notificação por enquanto.</p>
      </div>
    </div>
  )
}
