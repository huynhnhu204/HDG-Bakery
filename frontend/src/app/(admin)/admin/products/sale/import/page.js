"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Download, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

/** ====== Config ====== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API = "/api/v1";
const ADMIN_TOKEN_KEY = "admin_token";

/** ====== Helpers ====== */
function getToken() {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error?.message || `HTTP ${res.status}`);
  }
  return await res.json();
}

/** ====== Main Component ====== */
export default function ImportSalePage() {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [success, setSuccess] = useState("");

  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErr("Chỉ hỗ trợ file CSV");
      return;
    }

    setFile(selectedFile);
    setErr("");
    
    // Parse CSV preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n').filter(l => l.trim());
      const headers = lines[0]?.split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          product_id: values[0]?.trim(),
          price_sale: values[1]?.trim(),
          date_begin: values[2]?.trim(),
          date_end: values[3]?.trim(),
          status: values[4]?.trim() || '1',
        };
      }).filter(row => row.product_id && row.price_sale);
      
      setPreview(data.slice(0, 10)); // Show first 10 rows
    };
    reader.readAsText(selectedFile);
  }

  async function handleImport() {
    if (!file) {
      setErr("Vui lòng chọn file CSV");
      return;
    }

    try {
      setLoading(true);
      setErr("");
      setSuccess("");

      // Read and parse CSV
      const text = await file.text();
      const lines = text.split('\n').filter(l => l.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        return {
          product_id: values[0]?.trim(),
          price_sale: values[1]?.trim(),
          date_begin: values[2]?.trim(),
          date_end: values[3]?.trim(),
          status: values[4]?.trim() || '1',
        };
      }).filter(row => row.product_id && row.price_sale);

      if (data.length === 0) {
        throw new Error("Không có dữ liệu hợp lệ trong file");
      }

      // Import each row
      const results = [];
      for (const row of data) {
        try {
          await apiFetch(`${BASE}${API}/product-sale`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              product_id: Number(row.product_id),
              price_sale: Number(row.price_sale),
              date_begin: row.date_begin,
              date_end: row.date_end,
              status: Number(row.status || 1),
            }),
          });
          results.push({ success: true, product_id: row.product_id });
        } catch (e) {
          results.push({ success: false, product_id: row.product_id, error: e.message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      setSuccess(`Import thành công ${successCount}/${data.length} sản phẩm`);
      
      setTimeout(() => {
        router.push("/admin/products/sale");
      }, 2000);
    } catch (e) {
      setErr(e?.message || "Import thất bại");
    } finally {
      setLoading(false);
    }
  }

  function downloadTemplate() {
    const template = `product_id,price_sale,date_begin,date_end,status
1,250000,2024-12-15T09:00:00,2024-12-22T18:00:00,1
2,300000,2024-12-15T09:00:00,2024-12-22T18:00:00,1`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'khuyenmai_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/admin/products/sale"
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={24} />
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Import khuyến mãi</h1>
          <p className="text-gray-600 mt-1">Import nhiều sản phẩm khuyến mãi từ file CSV</p>
        </div>
      </div>

      {/* Import Form */}
      <div className="bg-white border rounded-lg p-6 space-y-6">
        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-700">{err}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
          <h3 className="font-medium text-blue-900">Hướng dẫn import</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Chỉ hỗ trợ file CSV</li>
            <li>Định dạng: product_id,price_sale,date_begin,date_end,status</li>
            <li>product_id: ID sản phẩm</li>
            <li>price_sale: Giá khuyến mãi (số)</li>
            <li>date_begin: Ngày bắt đầu (YYYY-MM-DDTHH:mm:ss)</li>
            <li>date_end: Ngày kết thúc (YYYY-MM-DDTHH:mm:ss)</li>
            <li>status: 1 (bật) hoặc 0 (tắt)</li>
          </ul>
        </div>

        {/* Download Template */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            <Download size={20} />
            Tải mẫu file CSV
          </button>
        </div>

        {/* File Upload */}
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer flex flex-col items-center gap-4"
          >
            <FileSpreadsheet size={48} className="text-gray-400" />
            <div>
              <span className="text-blue-600 hover:text-blue-800">
                Chọn file CSV
              </span>
              <span className="text-gray-600"> hoặc kéo thả vào đây</span>
            </div>
            {file && (
              <div className="text-sm text-gray-600">
                Đã chọn: {file.name}
              </div>
            )}
          </label>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Xem trước dữ liệu (10 dòng đầu)
            </h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Product ID</th>
                    <th className="px-3 py-2 text-left">Giá KM</th>
                    <th className="px-3 py-2 text-left">Bắt đầu</th>
                    <th className="px-3 py-2 text-left">Kết thúc</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {preview.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">{row.product_id}</td>
                      <td className="px-3 py-2">{row.price_sale}</td>
                      <td className="px-3 py-2">{row.date_begin}</td>
                      <td className="px-3 py-2">{row.date_end}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Link
            href="/admin/products/sale"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Hủy
          </Link>
          <button
            onClick={handleImport}
            disabled={loading || !file}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Đang import..." : (
              <>
                <Upload size={20} />
                Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


