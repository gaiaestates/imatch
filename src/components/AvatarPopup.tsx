'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function AvatarPopup({ hasAvatar }: { hasAvatar: boolean }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (hasAvatar) return
    try {
      const shown = sessionStorage.getItem('avatar_popup_shown')
      if (!shown) {
        setTimeout(() => setShow(true), 1500)
        sessionStorage.setItem('avatar_popup_shown', '1')
      }
    } catch {}
  }, [hasAvatar])

  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShow(false)}>
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-xl font-semibold text-stone-800 mb-2">Complete seu perfil</h2>
        <p className="text-sm text-stone-500 mb-6">
          Adicione uma foto para que outros corretores reconheçam você e confiem nas suas demandas.
        </p>
        <div className="flex gap-3">
          <button onClick={() => setShow(false)}
            className="flex-1 border border-stone-300 text-stone-600 font-medium py-2.5 rounded-xl text-sm hover:bg-stone-50 transition-colors">
            Agora não
          </button>
          <Link href="/perfil" onClick={() => setShow(false)}
            className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-medium py-2.5 rounded-xl text-sm transition-colors text-center block">
            Adicionar foto
          </Link>
        </div>
      </div>
    </div>
  )
}
