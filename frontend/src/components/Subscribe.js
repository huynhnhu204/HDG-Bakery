"use client";

import { useState } from "react";

export default function Subscribe({
  imageSrc =
    "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=1600&auto=format&fit=crop",
  imageAlt = "Promo",
  imageHref = "/",
}) {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      alert("Vui lòng nhập email!");
      return;
    }
    alert(`Đăng ký thành công với email: ${email}`);
    setEmail("");
  };

  return (
    <section className="mb-12 max-w-6xl mx-auto">
      <div className="grid md:grid-cols-2 gap-4 items-stretch bg-amber-50 rounded-xl p-3 md:p-4 shadow-sm">
        {/* Left: clickable image */}
        <a href={imageHref} className="block overflow-hidden rounded-lg">
          <img
            src={imageSrc}
            alt={imageAlt}
            className="w-full h-full object-cover rounded-lg"
            loading="lazy"
          />
        </a>

        {/* Right: copy + form */}
        <div className="flex flex-col justify-center px-2 md:px-6">
          <h2 className="text-2xl md:text-4xl font-extrabold text-gray-900 mb-3">
            Đăng ký nhận tin
          </h2>
          <p className="text-gray-700 mb-6 leading-relaxed">
            Đăng ký ngay và được giảm giá <span className="font-semibold">15%</span>
            cho lần mua hàng đầu tiên và nhiều chương trình hấp dẫn dành cho bạn!
          </p>

          <form
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row items-stretch gap-3 w-full"
          >
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Nhập email nhận tin khuyến mãi"
              className="flex-1 rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              required
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-orange-600 text-white px-6 py-3 font-semibold hover:bg-orange-700 transition-colors"
            >
              ĐĂNG KÝ
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
