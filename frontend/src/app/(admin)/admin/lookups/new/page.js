"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

/** ===== API base ===== */
const BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");
const API  = "/api/v1";
const KEY  = "admin_token";

function getToken() {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(KEY); } catch { return null; }
}

const Label = ({ children }) => (
  <label className="block text-sm font-medium text-gray-700 mb-1">{children}</label>
);
const TextInput = ({ className = "", ...rest }) => (
  <input
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
      className
    }
  />
);
const TextArea = ({ className = "", ...rest }) => (
  <textarea
    {...rest}
    className={
      "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 " +
      className
    }
  />
);

export default function LookupNewPage() {
  const router = useRouter();
  const [tagName, setTagName] = useState("");
  const [bulkTags, setBulkTags] = useState("");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [ok, setOk] = useState("");

  async function createOne(name) {
    const token = getToken();
    const r = await fetch(`${BASE}${API}/lookups/tags`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ tag: name }), // gửi "tag"
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d?.message || "Tạo tag thất bại");
    return d?.data ?? { id: Date.now(), tag: name, status: 1 };
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk("");

    try {
      const queued = [];
      const single = (tagName || "").trim();
      if (single) queued.push(single);

      const bulk = (bulkTags || "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      queued.push(...bulk);

      if (queued.length === 0) throw new Error("Hãy nhập ít nhất 1 tag.");

      for (const n of queued) await createOne(n);

      setOk(`Đã thêm ${queued.length} tag gợi ý.`);
      setTagName("");
      setBulkTags("");
      setTimeout(() => router.push("/admin/lookups"), 600);
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-rose-50 py-10">
      <div className="mx-auto max-w-3xl rounded-xl bg-white p-6 shadow-sm ring-1 ring-rose-100">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Thêm Lookups (tối giản)</h1>
          <button
            onClick={() => history.back()}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
          >
            Quay lại
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6">
          <div>
            <Label>Tag gợi ý (1 tag)</Label>
            <TextInput
              placeholder="VD: Sinh nhật"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
            />
          </div>

          <div>
            <Label>Thêm nhiều tag (mỗi dòng 1 tag)</Label>
            <TextArea
              rows={6}
              placeholder={"VD:\nTrà chiều\nKhông trứng\nKhông sữa"}
              value={bulkTags}
              onChange={(e) => setBulkTags(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => { setTagName(""); setBulkTags(""); }}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Xoá nhập
            </button>
            <button
              disabled={busy}
              className="rounded-md bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60"
            >
              {busy ? "Đang thêm…" : "Lưu"}
            </button>
          </div>

          {err && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">Lỗi: {err}</div>}
          {ok && <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">{ok}</div>}
        </form>
      </div>
    </div>
  );
}
