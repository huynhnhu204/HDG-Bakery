"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

// Simple cache for categories
const categoryCache = new Map();
const CACHE_TTL = 60000; // 60 seconds

export default function CategoryCards() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cacheKey = `${API_BASE}/api/v1/categories?status=1&per_page=8`;
    const cached = categoryCache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setCategories(cached.data);
      setLoading(false);
      return;
    }

    fetch(cacheKey, {
      cache: "force-cache",
      next: { revalidate: 60 }
    })
      .then((res) => res.json())
      .then((data) => {
        const cats = Array.isArray(data?.data) ? data.data : [];
        const result = cats.slice(0, 4); // Chỉ lấy 4 categories đầu tiên
        // Cache the result
        categoryCache.set(cacheKey, { data: result, timestamp: Date.now() });
        setCategories(result);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="py-8 bg-[#faf7f2]">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-center text-gray-500">Đang tải danh mục…</p>
        </div>
      </section>
    );
  }

  if (categories.length === 0) return null;

  const getCategoryImage = (cat) => {
    // ✅ Ưu tiên image_url từ API (đã được normalize), fallback về image hoặc ảnh mặc định
    if (cat.image_url) return cat.image_url;
    if (!cat.image) return "/cake1.jpg";
    if (cat.image.startsWith("http")) return cat.image;
    if (cat.image.startsWith("/")) return cat.image;
    // Fallback: thử normalize image path giống như Product
    const cleaned = cat.image.replace(/^\/+/, "");
    return `${API_BASE}/api/v1/storage/${cleaned.replace(/^storage\//, "")}`;
  };

  return (
    <section className="py-12 bg-[#faf7f2]">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/category/${cat.slug || cat.id}`}
              className="group relative overflow-hidden rounded-xl hover:shadow-lg transition-all duration-300"
            >
              <div className="relative h-64 w-full">
                <Image
                  src={getCategoryImage(cat)}
                  alt={cat.name}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                  <h3 className="text-white font-bold text-lg group-hover:text-orange-400 transition-colors">
                    {cat.name}
                  </h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
