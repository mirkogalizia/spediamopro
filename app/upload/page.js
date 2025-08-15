"use client";

import { useState } from "react";

export default function UploadVariants() {
  const [uploadStatus, setUploadStatus] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/uploadVariants", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setUploadStatus(data.message || "Upload completato.");
  };

  return (
    <div className="flex items-center justify-center min-h-screen pl-[240px] bg-white">
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold">Upload Varianti CSV</h1>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="block mx-auto text-sm"
        />
        {uploadStatus && (
          <p className="text-green-600 font-semibold">{uploadStatus}</p>
        )}
      </div>
    </div>
  );
}