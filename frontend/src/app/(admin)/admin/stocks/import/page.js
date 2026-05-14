"use client";

import { useState } from "react";

const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/,"");
const API  = "/api/v1";

export default function StockInImportPage() {
  const [date, setDate] = useState(()=>new Date().toISOString().slice(0,10));
  const [supplier, setSupplier] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!file) return alert("Chọn file CSV trước!");
    const fd = new FormData();
    fd.append('date', date);
    if (supplier) fd.append('supplier', supplier);
    if (note)     fd.append('note', note);
    fd.append('file', file);

    setLoading(true);
    try {
      const res = await fetch(`${BASE}${API}/stock-ins/import`, { method: "POST", body: fd });
      const j = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(j?.message || "Import thất bại");
      alert("Import thành công!");
      window.location.href = "/admin/stocks";
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Import phiếu nhập (CSV)</h1>
      <div className="grid md:grid-cols-3 gap-3 bg-white border rounded-xl p-4">
        <div>
          <label className="block text-xs text-gray-500">Ngày</label>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Nhà cung cấp</label>
          <input value={supplier} onChange={(e)=>setSupplier(e.target.value)} className="border rounded px-3 py-2 w-full" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs text-gray-500">Ghi chú</label>
          <textarea value={note} onChange={(e)=>setNote(e.target.value)} className="border rounded px-3 py-2 w-full" rows={2} />
        </div>

        <div className="md:col-span-3">
          <label className="block text-xs text-gray-500 mb-1">Chọn file CSV</label>
          <input type="file" accept=".csv,text/csv" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          <p className="text-xs text-gray-500 mt-1">Định dạng: <code>product_id,qty,price</code> (có header)</p>
        </div>
      </div>

      <div>
        <button disabled={loading} onClick={submit} className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800">
          {loading ? "Đang import..." : "Import"}
        </button>
      </div>
    </div>
  );
}
