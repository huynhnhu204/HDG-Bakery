import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Chính sách vận chuyển | Dola Bakery",
  description: "Chính sách vận chuyển và giao hàng tại Dola Bakery.",
};

export default function ShippingPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Chính sách vận chuyển", item: "/policy/van-chuyen" },
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
            <li className="text-gray-900 font-semibold">Vận chuyển</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Chính sách vận chuyển</h1>
              <p className="mt-2 text-gray-700">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>1. Khu vực giao hàng</h2>
              <ul>
                <li><strong>Nội thành TP.HCM:</strong> Tất cả các quận, huyện</li>
                <li><strong>Khu vực lân cận:</strong> Bình Dương, Đồng Nai, Long An</li>
              </ul>
              <p>Đối với khu vực ngoài TP.HCM, vui lòng liên hệ để được tư vấn về phí vận chuyển.</p>

              <h2>2. Thời gian giao hàng</h2>
              <ul>
                <li><strong>Giao hàng tiêu chuẩn:</strong> 2-4 ngày làm việc</li>
                <li><strong>Giao hàng nhanh:</strong> Trong ngày (đặt trước 12:00)</li>
                <li><strong>Giao hàng theo lịch:</strong> Hẹn giờ theo yêu cầu</li>
              </ul>

              <h2>3. Phí vận chuyển</h2>
              <ul>
                <li><strong>Đơn hàng trên 300.000đ:</strong> Miễn phí vận chuyển</li>
                <li><strong>Đơn hàng dưới 300.000đ:</strong> 30.000đ</li>
                <li><strong>Giao hàng nhanh:</strong> +20.000đ</li>
                <li><strong>Giao hàng ngoại thành:</strong> Theo bảng phí</li>
              </ul>

              <h2>4. Quy trình giao hàng</h2>
              <ol>
                <li>Đặt hàng thành công → Xác nhận đơn hàng qua email/SMS</li>
                <li>Chuẩn bị đơn hàng → Đóng gói cẩn thận</li>
                <li>Giao hàng → Nhân viên gọi điện xác nhận</li>
                <li>Nhận hàng → Kiểm tra và ký xác nhận</li>
              </ol>

              <h2>5. Đóng gói</h2>
              <p>
                Tất cả sản phẩm được đóng gói cẩn thận trong hộp chuyên dụng,
                đảm bảo chất lượng sản phẩm trong quá trình vận chuyển.
              </p>

              <h2>6. Theo dõi đơn hàng</h2>
              <p>
                Bạn có thể theo dõi trạng thái đơn hàng qua email, mã đơn hàng
                hoặc liên hệ hotline 1900 6750 để được cập nhật.
              </p>

              <h2>7. Chăm sóc sau giao hàng</h2>
              <p>
                Sau khi nhận hàng, nếu có vấn đề về chất lượng sản phẩm,
                vui lòng liên hệ ngay để được hỗ trợ.
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
