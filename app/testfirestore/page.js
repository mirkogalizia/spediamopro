'use client';

import { useState } from 'react';
import { db } from '../../lib/firebase'; // se ti trovi in /app/testfirestore/page.js
import { collection, addDoc } from 'firebase/firestore';

export default function TestFirestorePage() {
  const [result, setResult] = useState(null);

  const handleTestWrite = async () => {
    try {
      const docRef = await addDoc(collection(db, "test_write"), {
        createdAt: new Date(),
        message: "Scrittura riuscita ✔️",
        test: true,
      });
      setResult(`Documento scritto con ID: ${docRef.id}`);
    } catch (e) {
      setResult(`Errore: ${e.message}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center p-8">
      <h1 className="text-3xl font-bold mb-6">🧪 Test Firestore Write</h1>
      <button
        onClick={handleTestWrite}
        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
      >
        Scrivi su Firestore
      </button>
      {result && <p className="mt-6 text-lg">{result}</p>}
    </div>
  );
}