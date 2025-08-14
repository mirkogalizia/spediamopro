'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'

interface RigaProduzione {
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
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')

  useEffect(() => {
    const today = new Date()
    const weekAgo = new Date()
    weekAgo.setDate(today.getDate() - 7)

    setFrom(weekAgo.toISOString().split('T')[0])
    setTo(today.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (!from || !to) return

    async function fetchProduzione() {
      setLoading(true)
      try {
        const res = await fetch(`/api/produzione?from=${from}&to=${to}`)
        const data = await res.json()
        if (data.ok) {
          setRighe(data.produzione)
          const saved = localStorage.getItem('stampati')
          if (saved) setStampati(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Errore fetch produzione:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchProduzione()
  }, [from, to])

  const toggleStampato = (variant_id: number) => {
    const updated = { ...stampati, [variant_id]: !stampati[variant_id] }
    setStampati(updated)
    localStorage.setItem('stampati', JSON.stringify(updated))
  }

  return (
    <div className="p-8 pt-6 pl-[250px] bg-gray-50 min-h-screen font-sans">
      <h1 className="text-3xl font-semibold text-gray-900 mb-6">📦 Produzione</h1>

      <div className="flex items-center gap-4 mb-4">
        <label className="text-sm">Da:</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border p-2 rounded-md" />
        <label className="text-sm">A:</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border p-2 rounded-md" />
      </div>

      {loading ? (
        <p className="text-gray-500">Caricamento in corso...</p>
      ) : (
        <div className="overflow-x-auto bg-white shadow-md rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 text-left">
              <tr>
                <th className="px-4 py-3">Stampato</th>
                <th className="px-4 py-3">Ordine</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Colore</th>
                <th className="px-4 py-3">Taglia</th>
                <th className="px-4 py-3">Grafica</th>
                <th className="px-4 py-3">Preview</th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga) => (
                <tr
                  key={riga.variant_id + '-' + riga.order_name}
                  className="border-b hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={!!stampati[riga.variant_id]}
                      onChange={() => toggleStampato(riga.variant_id)}
                      className="scale-125 accent-green-600"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono">{riga.order_name}</td>
                  <td className="px-4 py-3">{riga.tipo_prodotto}</td>
                  <td className="px-4 py-3 capitalize">{riga.colore}</td>
                  <td className="px-4 py-3 uppercase">{riga.taglia}</td>
                  <td className="px-4 py-3 text-gray-600">{riga.grafica}</td>
                  <td className="px-4 py-3">
                    {riga.immagine ? (
                      <div className="w-14 h-14 relative">
                        <Image
                          src={riga.immagine}
                          alt={riga.grafica}
                          fill
                          className="object-contain rounded-md border"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}