import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Chính sách đổi trả | Dola Bakery",
  description: "Chính sách đổi trả và hoàn tiền sản phẩm tại Dola Bakery.",
};

export default function ReturnPolicyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Chính sách đổi trả", item: "/policy/doi-tra" },
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
            <li className="text-gray-900 font-semibold">Đổi trả</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Chính sách đổi trả</h1>
              <p className="mt-2 text-gray-700">Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}</p>
            </header>

            <div className="prose max-w-none prose-headings:text-amber-800 prose-p:text-gray-700">
              <h2>1. Thời gian đổi trả</h2>
              <p>
                Chúng tôi chấp nhận yêu cầu đổi trả trong vòng <strong>24 giờ</strong> kể từ thời điểm nhận hàng.
              </p>

              <h2>2. Điều kiện đổi trả</h2>
              <p>Sản phẩm đủ điều kiện đổi trả khi:</p>
              <ul>
                <li>Sản phẩm bị lỗi do sản xuất, hư hỏng trong quá trình vận chuyển</li>
                <li>Sản phẩm không đúng với đơn hàng đã đặt</li>
                <li>Sản phẩm còn nguyên vẹn, chưa được sử dụng</li>
                <li>Có hóa đơn/bằng chứng mua hàng</li>
              </ul>

              <h2>3. Không đổi trả</h2>
              <p>Chúng tôi không chấp nhận đổi trả trong các trường hợp:</p>
              <ul>
                <li>Quá thời gian 24 giờ từ lúc nhận hàng</li>
                <li>Sản phẩm đã được sử dụng một phần</li>
                <li>Sản phẩm bị hư hỏng do khách hàng</li>
                <li>Không có hóa đơn/bằng chứng mua hàng</li>
              </ul>

              <h2>4. Quy trình đổi trả</h2>
              <ul>
                <li>Liên hệ hotline 1900 6750 hoặc email heyzun@support.vn</li>
                <li>Cung cấp thông tin đơn hàng, lý do đổi trả</li>
                <li>Chụp ảnh sản phẩm để xác minh</li>
                <li>Chúng tôi sẽ xử lý và phản hồi trong 48 giờ</li>
              </ul>

              <h2>5. Đổi hàng</h2>
              <p>
                Trong trường hợp muốn đổi sang sản phẩm khác, vui lòng liên hệ để được hỗ trợ.
                Việc đổi hàng chỉ áp dụng với sản phẩm cùng hoặc cao hơn giá trị đơn hàng gốc.
              </p>

              <h2>6. Hoàn tiền</h2>
              <p>
                Nếu đổi trả được chấp nhận, chúng tôi sẽ hoàn lại tiền trong vòng 5-7 ngày làm việc
                qua phương thức thanh toán ban đầu của bạn.
              </p>
            </div>
          </article>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Cần hỗ trợ?</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><strong>Hotline:</strong> <a href="tel:19006750" className="hover:underline">1900 6750</a></p>
                <p><strong>Email:</strong> <a href="mailto:heyzun@support.vn" className="hover:underline">heyzun@support.vn</a></p>
                <p><strong>Giờ làm việc:</strong> 8:00 - 22:00 hàng ngày</p>
              </div>
              <div className="mt-6">
                <Link href="/contact" className="block w-full text-center rounded-lg bg-amber-600 px-3 py-2 font-semibold text-white hover:bg-amber-700">
                  Liên hệ hỗ trợ
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
