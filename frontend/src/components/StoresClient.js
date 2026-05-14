// src/components/StoresClient.js
"use client";

import { useMemo, useState, useEffect } from "react";

export default function StoresClient({ stores = [] }) {
  // Lấy danh sách tỉnh/thành & quận/huyện từ dữ liệu
  const provinces = useMemo(() => {
    const set = new Set(stores.map((s) => s.province));
    return Array.from(set);
  }, [stores]);

  const districtsByProvince = useMemo(() => {
    const map = new Map();
    for (const s of stores) {
      if (!map.has(s.province)) map.set(s.province, new Set());
      map.get(s.province).add(s.district);
    }
    return Object.fromEntries(
      Array.from(districtsMap(map)).map(([k, v]) => [k, Array.from(v)])
    );

    function* districtsMap(m) {
      for (const [k, v] of m.entries()) yield [k, v];
    }
  }, [stores]);

  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const filtered = useMemo(() => {
    return stores.filter((s) => {
      const okP = province ? s.province === province : true;
      const okD = district ? s.district === district : true;
      return okP && okD;
    });
  }, [stores, province, district]);

  const [activeId, setActiveId] = useState(
    filtered.length ? filtered[0].id : stores[0]?.id
  );

  useEffect(() => {
    setActiveId(filtered.length ? filtered[0].id : stores[0]?.id);
  }, [province, district]); // khi đổi bộ lọc -> chọn chi nhánh đầu tiên

  const activeStore =
    filtered.find((s) => s.id === activeId) ||
    filtered[0] ||
    stores[0] ||
    null;

  const mapSrc = activeStore
    ? `https://www.google.com/maps?q=${encodeURIComponent(
        activeStore.address
      )}&hl=vi&output=embed`
    : "";

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Cột trái: lọc + danh sách */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        {/* Bộ lọc */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="relative">
            <label className="sr-only" htmlFor="province">
              Chọn tỉnh thành
            </label>
            <select
              id="province"
              value={province}
              onChange={(e) => {
                setProvince(e.target.value);
                setDistrict("");
              }}
              className="w-full rounded-lg border bg-white px-3 py-2"
            >
              <option value="">Chọn tỉnh thành</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <label className="sr-only" htmlFor="district">
              Chọn quận/huyện
            </label>
            <select
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              disabled={!province}
              className="w-full rounded-lg border bg-white px-3 py-2 disabled:opacity-60"
            >
              <option value="">Chọn quận/huyện</option>
              {(districtsByProvince[province] || []).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Danh sách chi nhánh */}
        <div className="max-h-[540px] overflow-y-auto pr-2 space-y-3">
          {filtered.map((s) => {
            const isActive = s.id === activeId;
            return (
              <button
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={
                  "w-full text-left rounded-xl border bg-white p-4 transition " +
                  (isActive
                    ? "border-amber-500 ring-1 ring-amber-400"
                    : "border-amber-200 hover:bg-amber-50")
                }
                aria-pressed={isActive}
              >
                <h3 className="font-semibold text-amber-700">{s.name}</h3>
                <p className="mt-1 text-sm text-gray-700">
                  <strong>Địa chỉ:</strong> {s.address}
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  <strong>Hotline:</strong>{" "}
                  <a className="text-amber-700 hover:underline" href={`tel:${s.hotline.replace(/\s/g, "")}`}>
                    {s.hotline}
                  </a>
                </p>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <p className="text-sm text-gray-500">Không tìm thấy cửa hàng phù hợp.</p>
          )}
        </div>
      </div>

      {/* Cột phải: Bản đồ */}
      <div className="rounded-2xl overflow-hidden border">
        {mapSrc ? (
          <iframe
            title={`Bản đồ đến ${activeStore?.name || "cửa hàng"}`}
            src={mapSrc}
            width="100%"
            height="620"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div className="flex h-[620px] items-center justify-center text-gray-500">
            Chọn một cửa hàng để xem bản đồ
          </div>
        )}
      </div>
    </section>
  );
}
