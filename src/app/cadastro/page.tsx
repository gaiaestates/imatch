'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function CadastroPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [creci, setCreci] = useState('')
  const [phone, setPhone] = useState('')
  const [imobiliaria, setImobiliaria] = useState('')
  const [autonomo, setAutonomo] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleCadastro(e: React.FormEvent) {
    e.preventDefault()
    if (!phone) { setError('WhatsApp é obrigatório.'); return }
    if (!creci) { setError('CRECI é obrigatório.'); return }
    if (!autonomo && !imobiliaria) { setError('Informe a imobiliária ou marque "Sou autônomo".'); return }

    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (!data.session) {
      setConfirmEmail(true)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').update({
        creci,
        phone,
        imobiliaria: autonomo ? null : imobiliaria,
        autonomo,
        creci_status: 'pendente',
      }).eq('id', data.user.id)

      // Verificação automática assíncrona (não bloqueia o cadastro)
      fetch('/api/creci/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creci }),
      }).catch(() => {})
    }

    router.push('/demandas')
    router.refresh()
  }

  if (confirmEmail) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4">📧</div>
          <h1 className="text-3xl font-serif font-medium text-emerald-800 mb-2">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </h1>
          <h2 className="text-lg font-medium text-stone-800 mb-2">Confirme seu email</h2>
          <p className="text-sm text-stone-500 mb-6">
            Enviamos um link para <strong className="text-stone-700">{email}</strong>. Clique para ativar sua conta.
          </p>
          <p className="text-xs text-stone-400">
            Não recebeu?{' '}
            <button onClick={() => setConfirmEmail(false)} className="text-emerald-700 hover:underline">
              Tentar novamente
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-medium text-emerald-800">
            i<em className="font-light text-stone-400 not-italic">Match</em>
          </h1>
          <p className="text-stone-500 mt-1 text-sm">Plataforma de demandas imobiliárias</p>
        </div>

        <form onSubmit={handleCadastro} className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 space-y-4">
          <h2 className="text-lg font-medium text-stone-800">Criar conta</h2>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Nome completo</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="João Silva" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="seu@email.com" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="mínimo 6 caracteres" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              WhatsApp <span className="text-red-500">*</span>
            </label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="(11) 99999-9999" />
          </div>

          {/* Imobiliária + Autônomo */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-stone-700">
                Imobiliária <span className="text-red-500">*</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={autonomo} onChange={e => setAutonomo(e.target.checked)}
                  className="w-4 h-4 accent-emerald-600 rounded" />
                <span className="text-sm text-stone-600">Sou autônomo</span>
              </label>
            </div>
            <input type="text" value={imobiliaria} onChange={e => setImobiliaria(e.target.value)}
              disabled={autonomo}
              required={!autonomo}
              placeholder={autonomo ? 'Autônomo' : 'Nome da imobiliária'}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-stone-50 disabled:text-stone-400" />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              CRECI <span className="text-red-500">*</span>
            </label>
            <input type="text" value={creci} onChange={e => setCreci(e.target.value)} required
              className="w-full border border-stone-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="12345-F" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60">
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-stone-500 mt-4">
          Já tem conta?{' '}
          <Link href="/login" className="text-emerald-700 font-medium hover:underline">Entrar</Link>
        </p>
      </div>
    </main>
  )
}
