"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

function normImg(src) {
  if (!src) return "/slide1.jpg";
  const s = typeof src === "string" ? src : src.image || src.url || src.src || "";
  if (!s) return "/slide1.jpg";

  if (s.startsWith("http")) return s;
  if (s.startsWith("/")) return `${API_BASE}/api/v1${s}`;

  if (s.includes("storage/")) {
    return `${API_BASE}/api/v1/${s.replace(/^\/+/, "")}`;
  }

  return "/slide1.jpg";
}

/** Lưu & hiển thị "Sản phẩm đã xem" (localStorage, tối đa 10) */
export default function RecentlyViewed({ me }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const key = "recent_products";
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {}

    // thêm sp hiện tại lên đầu, unique theo id
    const filtered = list.filter((x) => x.id !== me.id);
    const next = [
      { id: me.id, slug: me.slug, name: me.name, price: me.price_buy, image: me.thumbnail || me.image },
      ...filtered,
    ].slice(0, 10);

    localStorage.setItem(key, JSON.stringify(next));
    setItems(next.filter((x) => x.id !== me.id));
  }, [me]);

  if (!items.length) return null;

  return (
    <section className="mt-14">
      <h2 className="text-2xl font-serif font-bold text-center mb-6">Sản phẩm đã xem</h2>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {items.map((it) => (
          <Link
            key={it.id}
            href={`/product/${it.slug || it.id}`}
            className="bg-white rounded-xl shadow hover:shadow-lg overflow-hidden"
          >
            <div className="relative w-full h-36">
              <Image
                src={normImg(it.image || "/slide1.jpg")}
                alt={it.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-3">
              <h3 className="font-medium line-clamp-1">{it.name}</h3>
              {it.price ? (
                <p className="text-amber-700 font-semibold mt-1">
                  {Number(it.price).toLocaleString("vi-VN")}₫
                </p>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
