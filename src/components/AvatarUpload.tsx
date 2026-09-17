'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  userId: string
  currentUrl?: string | null
  userName?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function AvatarUpload({ userId, currentUrl, userName = '', size = 'md' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState<string | null>(currentUrl ?? null)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const initial = userName.charAt(0).toUpperCase() || '?'
  const sz = { sm: 'w-10 h-10 text-base', md: 'w-20 h-20 text-2xl', lg: 'w-24 h-24 text-3xl' }[size]

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setErr('Máximo 5 MB'); return }

    setUploading(true)
    setErr('')
    try {
      const ext = file.type === 'image/png' ? 'png' : 'jpg'
      const path = `${userId}.${ext}`

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
      })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`

      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId)
      setUrl(publicUrl)
    } catch {
      setErr('Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={() => inputRef.current?.click()}
        className={`${sz} rounded-full overflow-hidden bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center relative group border-2 border-transparent hover:border-emerald-400 transition-all`}>
        {url
          ? <img src={url} alt="Avatar" className="w-full h-full object-cover" />
          : <span>{initial}</span>
        }
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-full flex items-center justify-center transition-all">
          <span className="text-white text-xs font-normal opacity-0 group-hover:opacity-100">Alterar</span>
        </div>
        {uploading && (
          <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      {err && <p className="text-xs text-red-500">{err}</p>}
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="text-xs text-emerald-700 hover:underline disabled:opacity-50">
        {url ? 'Alterar foto' : 'Adicionar foto'}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFile} />
    </div>
  )
}
