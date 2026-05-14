// src/components/Footer.js
export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000")
  .replace(/\/+$/, "");

// Gọi API lấy settings (điều chỉnh endpoint cho khớp Laravel của bạn)
async function fetchSettings() {
  // Gợi ý endpoint: /api/v1/settings/public (hoặc /api/v1/settings)
  const url = `${API_BASE}/api/v1/settings/public`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    
    if (!res.ok) {
      throw new Error(`API ${res.status}`);
    }

    const data = await res.json();
    const s = data?.data || data;

    return {
      site_name: s.site_name ?? "Dola Bakery",
      address: s.address ?? "",
      hotline: s.hotline ?? "",
      email: s.email ?? "",
    };
  } catch (error) {
    // Fallback khi API lỗi / chưa có endpoint
    // Không log error trong production để tránh noise
    if (process.env.NODE_ENV === 'development') {
      console.error("Footer: Failed to fetch settings:", error?.message || 'Unknown error');
    }
    return {
      site_name: "Dola Bakery",
      address: "70 Lữ Gia, P.15, Q.11, TP.HCM",
      hotline: "1900 6750",
      email: "support@example.com",
    };
  }
}

export default async function Footer() {
  const s = await fetchSettings();

  return (
    <footer className="mt-16 border-t border-orange-200 bg-orange-50">
      <div className="container mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-sm">
          {/* Company Information */}
          <div className="lg:col-span-2">
            <div className="flex items-center mb-4">
              <img
                src="/storage/logo-ft.png"
                alt={s.site_name}
                width={60}
                height={60}
                className="mr-3"
              />
              <h3 className="font-bold text-xl text-gray-900">{s.site_name}</h3>
            </div>
            <div className="space-y-2 text-gray-700">
              {s.address && (
                <p className="flex items-start">
                  <span className="mr-2">📍</span>
                  <span>{s.address}</span>
                </p>
              )}
              {s.hotline && (
                <p className="flex items-center">
                  <span className="mr-2">📞</span>
                  <span>Hotline: <a href={`tel:${s.hotline}`} className="text-orange-600 hover:text-orange-700 hover:underline">{s.hotline}</a></span>
                </p>
              )}
              {s.email && (
                <p className="flex items-center">
                  <span className="mr-2">✉️</span>
                  <span>Email: <a href={`mailto:${s.email}`} className="text-orange-600 hover:text-orange-700 hover:underline">{s.email}</a></span>
                </p>
              )}
              <p className="flex items-center">
                <span className="mr-2">🕐</span>
                <span>Giờ làm việc: 8:00 - 22:00 (Thứ 2 - Chủ nhật)</span>
              </p>
            </div>
          </div>

          {/* Category Links */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Danh mục liên kết</h4>
            <ul className="space-y-2 text-gray-700">
              <li><Link href="/about" className="hover:text-orange-600 transition-colors">Giới thiệu</Link></li>
              <li><Link href="/contact" className="hover:text-orange-600 transition-colors">Liên hệ</Link></li>
              <li><Link href="/policy/bao-mat" className="hover:text-orange-600 transition-colors">Chính sách bảo mật</Link></li>
              <li><Link href="/policy/dieu-khoan" className="hover:text-orange-600 transition-colors">Điều khoản sử dụng</Link></li>
              <li><Link href="/policy/doi-tra" className="hover:text-orange-600 transition-colors">Chính sách đổi trả</Link></li>
              <li><Link href="/policy/huong-dan-mua-hang" className="hover:text-orange-600 transition-colors">Hướng dẫn mua hàng</Link></li>
              <li><Link href="/policy/thanh-toan" className="hover:text-orange-600 transition-colors">Phương thức thanh toán</Link></li>
              <li><Link href="/policy/van-chuyen" className="hover:text-orange-600 transition-colors">Chính sách vận chuyển</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Hỗ trợ khách hàng</h4>
            <ul className="space-y-2 text-gray-700">
              <li><Link href="/support/faq" className="hover:text-orange-600 transition-colors">Câu hỏi thường gặp (FAQ)</Link></li>
              <li><Link href="/support/ho-tro" className="hover:text-orange-600 transition-colors">Trung tâm hỗ trợ</Link></li>
              <li><Link href="/support/khieu-nai" className="hover:text-orange-600 transition-colors">Khiếu nại</Link></li>
              <li><Link href="/support/bao-hanh" className="hover:text-orange-600 transition-colors">Hướng dẫn bảo hành</Link></li>
              <li><Link href="/support/chat" className="hover:text-orange-600 transition-colors">💬 Chat trực tuyến</Link></li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Kết nối với chúng tôi</h4>
            <div className="flex space-x-4">
              <a 
                href="https://facebook.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              <a 
                href="https://instagram.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white hover:from-purple-700 hover:to-pink-700 transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a 
                href="https://youtube.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                aria-label="YouTube"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              <a 
                href="https://zalo.me" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-colors"
                aria-label="Zalo"
              >
                <span className="text-xs font-bold">Z</span>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-orange-200 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-xs text-gray-600">
            <div className="mb-2 md:mb-0">
              <p>© {new Date().getFullYear()} {s.site_name}. All rights reserved.</p>
            </div>
            <div className="flex space-x-4">
              <span>Giấy phép KD số: 0123456789</span>
              <span>|</span>
              <span>MST: 0123456789</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
