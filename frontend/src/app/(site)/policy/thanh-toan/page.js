import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Phương thức thanh toán | Dola Bakery",
  description: "Các phương thức thanh toán được chấp nhận tại Dola Bakery.",
};

export default function PaymentPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Phương thức thanh toán", item: "/policy/thanh-toan" },
    ],
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
            <li><Link href="/policy" className="hover:underline">Chính sách</Link></li>
            <li aria-hidden="true" className="px-1">/</li>
            <li className="text-gray-900 font-semibold">Thanh toán</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Phương thức thanh toán</h1>
              <p className="mt-2 text-gray-700">Các hình thức thanh toán an toàn và tiện lợi</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>1. Thanh toán khi nhận hàng (COD)</h2>
              <p>
                Thanh toán trực tiếp cho nhân viên giao hàng khi nhận sản phẩm. Áp dụng cho tất cả
                đơn hàng trong khu vực TP.HCM.
              </p>
              <p><strong>Ưu điểm:</strong> An toàn, kiểm tra hàng trước khi thanh toán</p>

              <h2>2. Chuyển khoản ngân hàng</h2>
              <p>
                Chuyển khoản qua tài khoản ngân hàng của chúng tôi:
              </p>
              <ul>
                <li><strong>Vietcombank:</strong> 1234567890 - DO CO TY TNHH DOLA</li>
                <li><strong>Vietinbank:</strong> 0987654321 - DO CO TY TNHH DOLA</li>
              </ul>
              <p><strong>Nội dung:</strong> Mã đơn hàng + Tên khách hàng</p>

              <h2>3. Ví điện tử</h2>
              <p>
                Thanh toán qua các ví điện tử phổ biến:
              </p>
              <ul>
                <li>MoMo</li>
                <li>ZaloPay</li>
                <li>VNPay</li>
              </ul>

              <h2>4. Thẻ tín dụng/Ghi nợ</h2>
              <p>
                Thanh toán qua thẻ Visa, Mastercard, JCB được chấp nhận. Tất cả giao dịch
                được mã hóa an toàn theo chuẩn SSL/TLS.
              </p>

              <h2>Lưu ý thanh toán</h2>
              <ul>
                <li>Mọi giao dịch đều được mã hóa và bảo mật</li>
                <li>Không lưu trữ thông tin thẻ của khách hàng</li>
                <li>Nhận hóa đơn VAT theo yêu cầu</li>
                <li>Liên hệ nếu gặp vấn đề trong thanh toán</li>
              </ul>

              <h2>Xác nhận thanh toán</h2>
              <p>
                Sau khi thanh toán thành công, bạn sẽ nhận được email xác nhận và SMS thông báo.
                Đơn hàng sẽ được xử lý ngay sau khi xác nhận thanh toán.
              </p>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Cần hỗ trợ?</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Giờ làm việc:</strong> 8:00 - 22:00</p>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="block w-full text-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700">
                  Liên hệ
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
