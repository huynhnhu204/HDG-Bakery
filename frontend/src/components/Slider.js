"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";

const API_BASE_DEFAULT = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function absUrl(u, base) {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("/")) return `${base}${u}`;
  return `${base}/${u}`;
}

export default function Slider({
  apiBase = API_BASE_DEFAULT,
  position = "slideshow",
  intervalMs = 4000,
  className = "",
}) {
  const [banners, setBanners] = useState([]);
  const [index, setIndex] = useState(0);
  const [err, setErr] = useState("");
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const url = `${apiBase.replace(/\/+$/, "")}/api/v1/banners?position=${encodeURIComponent(
          position
        )}&status=1&per_page=0`;
        const res = await fetch(url, {
          cache: "no-store",
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        const raw = await res.json().catch(() => null);
        const arr = Array.isArray(raw) ? raw : raw?.data || [];
        setBanners(arr);
        setIndex(0);
      } catch (e) {
        if (e.name === 'AbortError') return; // Ignore abort errors
        setErr(e?.message || "Failed to fetch banners");
        setBanners([]);
      }
    })();
    return () => ac.abort();
  }, [apiBase, position]);

  useEffect(() => {
    if (!banners.length || paused) return;
    timerRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, intervalMs);
    return () => clearInterval(timerRef.current);
  }, [banners.length, paused, intervalMs]);

  if (err && !banners.length) return <div className="py-12 text-center text-red-600">Lỗi banner: {err}</div>;
  if (!banners.length) return <div className="py-12 text-center text-gray-400">Đang tải banner…</div>;

  return (
    <div
      className={`relative w-full overflow-visible ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {banners.map((b, i) => {
        const img = b.image_url || absUrl(b.image, apiBase) || "/slide1.jpg";
        const active = i === index;
        return (
          <a
            key={b.id ?? i}
            href={b.link || "#"}
            aria-label={b.name || `Banner ${i + 1}`}
            className={`block w-full transition-opacity duration-700 ${active ? "opacity-100" : "opacity-0 absolute inset-0"}`}
          >
            <img
              src={img}
              alt={b.name || `Banner ${i + 1}`}
              className="w-full h-auto object-contain"
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
            />
          </a>
        );
      })}

      {/* CTA Sale Button on Hero */}
      <a
        href="/product/sale"
        className="group absolute left-1/2 -translate-x-1/2 bottom-16 z-10 md:left-10 md:translate-x-0 md:bottom-20 inline-flex items-center rounded-full px-6 py-3 text-white font-semibold shadow-xl focus:outline-none focus:ring-2 focus:ring-orange-300 transition
                   bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 hover:-translate-y-0.5 active:translate-y-0"
        aria-label="Xem sản phẩm giảm giá"
      >
        <span className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 blur-lg opacity-40 group-hover:opacity-60 transition pointer-events-none"></span>
        <span className="relative inline-flex items-center gap-2">
          <Sparkles size={18} aria-hidden="true" className="opacity-90" />
          <span>Khuyến mãi HOT</span>
          <span className="ml-1 inline-flex items-center justify-center text-xs bg-white/20 rounded-full px-2 py-0.5">
            -50%
          </span>
        </span>
      </a>

      <button
        onClick={() => setIndex((index - 1 + banners.length) % banners.length)}
        className="absolute top-1/2 left-4 -translate-y-1/2 bg-black/60 text-white p-2.5 rounded-full hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label="Xem banner trước"
        title="Banner trước"
      >
        <ChevronLeft size={20} aria-hidden="true" />
      </button>
      <button
        onClick={() => setIndex((index + 1) % banners.length)}
        className="absolute top-1/2 right-4 -translate-y-1/2 bg-black/60 text-white p-2.5 rounded-full hover:bg-black/75 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
        aria-label="Xem banner tiếp theo"
        title="Banner tiếp theo"
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>

      <div className="absolute bottom-3 w-full flex justify-center gap-2">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Chuyển đến banner số ${i + 1}`}
            title={`Banner ${i + 1}`}
            className={`w-2.5 h-2.5 rounded-full ${i === index ? "bg-white" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
