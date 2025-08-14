'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

export default function ProduzionePage() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    if (!startDate || !endDate) return
    setLoading(true)
    try {
      const res = await fetch(`/api/orders/produzione?from=${startDate}&to=${endDate}`)
      const json = await res.json()
      setData(json)
    } catch (e) {
      console.error('Errore caricamento ordini:', e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-6 bg-white text-black">
      <h1 className="text-3xl font-semibold mb-4">Produzione</h1>

      <div className="flex gap-4 mb-6">
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
        <button
          onClick={fetchData}
          className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
        >
          Carica ordini
        </button>
      </div>

      {loading && <p>Caricamento in corso...</p>}

      {!loading && data.length > 0 && (
        <table className="w-full max-w-6xl border-collapse border text-sm">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="p-2 border">Data</th>
              <th className="p-2 border">Ordine</th>
              <th className="p-2 border">Tipologia</th>
              <th className="p-2 border">Taglia</th>
              <th className="p-2 border">Colore</th>
              <th className="p-2 border">Preview</th>
              <th className="p-2 border">Stampato</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index} className="border-t">
                <td className="p-2 border whitespace-nowrap">{item.data}</td>
                <td className="p-2 border">{item.order}</td>
                <td className="p-2 border">{item.tipologia}</td>
                <td className="p-2 border uppercase">{item.taglia}</td>
                <td className="p-2 border capitalize">{item.colore}</td>
                <td className="p-2 border">
                  <Image
                    src={item.image || '/placeholder.png'}
                    alt="preview"
                    width={60}
                    height={60}
                    className="rounded border"
                  />
                </td>
                <td className="p-2 border text-center">
                  <input type="checkbox" className="w-4 h-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {!loading && data.length === 0 && (
        <p className="mt-4 text-gray-500">Nessun ordine trovato.</p>
      )}
    </div>
  )
}
