'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

type RigaProduzione = {
  tipo_prodotto: string
  taglia: string
  colore: string
  grafica: string
  immagine: string | null
  order_name: string
  created_at: string
  variant_id: number
}

export default function ProduzionePage() {
  const [righe, setRighe] = useState<RigaProduzione[]>([])
  const [stampati, setStampati] = useState<{ [key: number]: boolean }>({})
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]
  const defaultFrom = new Date()
  defaultFrom.setDate(defaultFrom.getDate() - 7)
  const from = defaultFrom.toISOString().split('T')[0]

  useEffect(() => {
    async function fetchProduzione() {
      const res = await fetch(`/api/produzione?from=${from}&to=${today}`)
      const data = await res.json()
      if (data.ok) {
        setRighe(data.produzione)
        const saved = localStorage.getItem('stampati')
        if (saved) setStampati(JSON.parse(saved))
      }
      setLoading(false)
    }

    fetchProduzione()
  }, [])

  const toggleStampato = (variant_id: number) => {
    const updated = { ...stampati, [variant_id]: !stampati[variant_id] }
    setStampati(updated)
    localStorage.setItem('stampati', JSON.stringify(updated))
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">📦 Produzione - Ordini inevasi</h1>

      {loading ? (
        <p className="text-gray-500">Caricamento ordini in corso...</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {righe.map((riga) => (
            <div
              key={riga.variant_id + '-' + riga.order_name}
              className={`flex items-center gap-6 border p-4 rounded-xl shadow-sm transition ${
                stampati[riga.variant_id] ? 'bg-green-50' : 'bg-white'
              }`}
            >
              <input
                type="checkbox"
                className="scale-150 accent-green-600"
                checked={!!stampati[riga.variant_id]}
                onChange={() => toggleStampato(riga.variant_id)}
              />
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Ordine: <span className="font-mono">{riga.order_name}</span></p>
                <p className="text-lg font-semibold">{riga.tipo_prodotto} - {riga.taglia} / {riga.colore}</p>
                <p className="text-sm text-gray-600">Grafica: {riga.grafica}</p>
              </div>
              {riga.immagine ? (
                <div className="w-24 h-24 relative">
                  <Image
                    src={riga.immagine}
                    alt={riga.grafica}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 flex items-center justify-center bg-gray-100 text-gray-400 text-xs rounded-lg">
                  No img
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}