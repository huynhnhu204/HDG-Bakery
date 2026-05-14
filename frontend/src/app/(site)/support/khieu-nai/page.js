"use client";

import Link from "next/link";
import Script from "next/script";
import { useState } from "react";

export default function ComplaintPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    orderCode: "",
    type: "",
    content: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Khiếu nại", item: "/support/khieu-nai" },
    ],
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Logic xử lý khiếu nại
    setSubmitted(true);
    setTimeout(() => {
      alert("Cảm ơn bạn đã gửi khiếu nại. Chúng tôi sẽ xử lý và phản hồi trong vòng 24 giờ.");
      setSubmitted(false);
      setFormData({ name: "", email: "", phone: "", orderCode: "", type: "", content: "" });
    }, 500);
  };

  return (
    <main className="min-h-dvh">
      <Script id="ld-breadcrumb" type="application/ld+json">
        {JSON.stringify(breadcrumbLd)}
      </Script>

      <nav aria-label="Breadcrumb" className="border-b bg-amber-50/60">
        <div className="container mx-auto px-4 h-12 flex items-center text-sm">
          <ol className="flex items-center gap-1 text-gray-600">
            <li><Link href="/" className="hover:underline">Trang chủ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li><Link href="/support" className="hover:underline">Hỗ trợ</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Khiếu nại</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Gửi khiếu nại</h1>
              <p className="mt-2 text-gray-700">
                Chúng tôi rất tiếc về sự cố này. Vui lòng điền thông tin bên dưới để chúng tôi xử lý.
              </p>
            </header>

            {submitted ? (
              <div className="p-8 bg-green-50 border border-green-200 rounded-xl text-center">
                <div className="text-4xl mb-4">✓</div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">Đã gửi khiếu nại thành công!</h2>
                <p className="text-gray-700">
                  Chúng tôi đã nhận được khiếu nại của bạn và sẽ xử lý trong vòng 24 giờ.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-xl p-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Họ tên *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Số điện thoại *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Mã đơn hàng (nếu có)</label>
                  <input
                    type="text"
                    value={formData.orderCode}
                    onChange={(e) => setFormData({...formData, orderCode: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Loại khiếu nại *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                  >
                    <option value="">Chọn loại khiếu nại</option>
                    <option value="cham-tra-giao">Chậm trễ giao hàng</option>
                    <option value="sai-san-pham">Sai sản phẩm</option>
                    <option value="chat-luong">Chất lượng sản phẩm</option>
                    <option value="thai-do-nv">Thái độ nhân viên</option>
                    <option value="khac">Khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Nội dung khiếu nại *</label>
                  <textarea
                    required
                    rows={6}
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                    placeholder="Mô tả chi tiết vấn đề bạn gặp phải..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition"
                >
                  Gửi khiếu nại
                </button>
              </form>
            )}
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Thông tin</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Thời gian phản hồi:</strong> Trong vòng 24 giờ</p>
              </div>
              <div className="mt-6">
                <Link href="/support/chat" className="block w-full text-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700">
                  💬 Chat ngay
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}


