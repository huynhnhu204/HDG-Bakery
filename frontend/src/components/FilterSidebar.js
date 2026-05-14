"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** props:
 * - categories: [{slug, label}]
 * - facetCounts: { [slug]: number }
 * - onRoute: (usp: URLSearchParams) => void   // điều hướng (mặc định window.location.search)
 */
export default function FilterSidebar({ categories = [], facetCounts = {}, onRoute }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [category, setCategory] = useState(sp.get("category") ?? "");
  const [pmin, setPmin] = useState(sp.get("pmin") ?? "");
  const [pmax, setPmax] = useState(sp.get("pmax") ?? "");

  useEffect(() => {
    setQ(sp.get("q") ?? "");
    setCategory(sp.get("category") ?? "");
    setPmin(sp.get("pmin") ?? "");
    setPmax(sp.get("pmax") ?? "");
  }, [sp]);

  const routeTo = (usp) => {
    if (typeof onRoute === "function") onRoute(usp);
    else window.location.search = usp.toString();
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const usp = new URLSearchParams();
    if (q) usp.set("q", q);
    if (category) usp.set("category", category);
    if (pmin) usp.set("pmin", pmin);
    if (pmax) usp.set("pmax", pmax);
    usp.set("page", "1");
    routeTo(usp);
  };

  const onClear = () => routeTo(new URLSearchParams());

  return (
    <form onSubmit={onSubmit} className="mb-4 grid gap-4 bg-white p-4 rounded-2xl shadow-sm border">
      <div>
        <label className="block text-sm font-medium mb-1">Tìm kiếm</label>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên, mã sản phẩm..."
          className="w-full rounded-lg border px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Danh mục</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
        >
          <option value="">Tất cả</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label} {typeof facetCounts[c.slug] === "number" ? `(${facetCounts[c.slug]})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Giá từ</label>
          <input
            type="number"
            min={0}
            value={pmin}
            onChange={(e) => setPmin(e.target.value)}
            placeholder="50.000"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Giá đến</label>
          <input
            type="number"
            min={0}
            value={pmax}
            onChange={(e) => setPmax(e.target.value)}
            placeholder="300.000"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="rounded-lg bg-orange-600 px-4 py-2 text-white font-semibold">
          Lọc
        </button>
        <button type="button" onClick={onClear} className="rounded-lg border px-4 py-2">
          Xóa bộ lọc
        </button>
      </div>
    </form>
  );
}
