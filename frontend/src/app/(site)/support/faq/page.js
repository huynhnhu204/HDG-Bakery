import Link from "next/link";
import Script from "next/script";

export const metadata = {
  title: "Câu hỏi thường gặp | Dola Bakery",
  description: "Các câu hỏi thường gặp về sản phẩm, đặt hàng và dịch vụ tại Dola Bakery.",
};

export default function FAQPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Dola Bakery mở cửa lúc mấy giờ?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Chúng tôi mở cửa từ 8:00 đến 22:00 mỗi ngày (Thứ 2 → Chủ nhật).",
        },
      },
      {
        "@type": "Question",
        name: "Làm thế nào để đặt hàng?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Bạn có thể đặt hàng trực tuyến trên website, gọi hotline 1900 6750 hoặc đến trực tiếp cửa hàng.",
        },
      },
    ],
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Hỗ trợ", item: "/support" },
      { "@type": "ListItem", position: 3, name: "FAQ", item: "/support/faq" },
    ],
  };

  const faqs = [
    {
      q: "Làm thế nào để đặt hàng?",
      a: "Bạn có thể đặt hàng qua 3 cách: 1) Đặt hàng trực tuyến trên website, 2) Gọi hotline 1900 6750, 3) Đến trực tiếp cửa hàng tại 70 Lữ Gia, Q.11, TP.HCM."
    },
    {
      q: "Thời gian giao hàng là bao lâu?",
      a: "Đối với đơn hàng trong nội thành TP.HCM: giao hàng trong 2-4 giờ từ lúc xác nhận. Đơn hàng ngoại thành: 1-2 ngày làm việc."
    },
    {
      q: "Có phí ship không?",
      a: "Đơn hàng trên 300.000đ được miễn phí ship trong khu vực nội thành TP.HCM. Đơn dưới 300.000đ phí ship 30.000đ."
    },
    {
      q: "Có thể đặt bánh tùy chỉnh theo yêu cầu không?",
      a: "Có, chúng tôi nhận làm bánh theo yêu cầu cho sinh nhật, kỷ niệm, sự kiện. Vui lòng đặt trước 2-3 ngày để chúng tôi chuẩn bị tốt nhất."
    },
    {
      q: "Thanh toán như thế nào?",
      a: "Chúng tôi chấp nhận thanh toán khi nhận hàng (COD), chuyển khoản ngân hàng hoặc qua các ví điện tử như MoMo, ZaloPay."
    },
    {
      q: "Có chính sách đổi trả không?",
      a: "Chúng tôi chấp nhận đổi trả trong vòng 24 giờ kể từ khi nhận hàng nếu sản phẩm có lỗi từ phía chúng tôi hoặc không đúng sản phẩm đã đặt."
    },
    {
      q: "Bánh có để được trong tủ lạnh không?",
      a: "Tùy loại bánh. Bánh kem, bánh mousse nên bảo quản trong tủ lạnh và dùng trong vòng 2-3 ngày. Bánh khô có thể để ở nhiệt độ phòng trong 1-2 tuần."
    },
    {
      q: "Có gửi hàng đến tỉnh khác không?",
      a: "Hiện tại chúng tôi chỉ giao hàng trong khu vực TP.HCM và lân cận. Đối với tỉnh xa, vui lòng liên hệ hotline để được tư vấn."
    },
    {
      q: "Làm sao để theo dõi đơn hàng?",
      a: "Sau khi đặt hàng, bạn sẽ nhận email/SMS xác nhận với mã đơn hàng. Bạn có thể liên hệ hotline để theo dõi tình trạng đơn hàng."
    },
    {
      q: "Có chương trình khuyến mãi nào không?",
      a: "Đúng vậy! Chúng tôi thường có các chương trình khuyến mãi, giảm giá cho khách hàng mới và khách hàng thân thiết. Theo dõi website hoặc fanpage để nhận thông tin mới nhất."
    }
  ];

  return (
    <main className="min-h-dvh">
      <Script id="ld-faq" type="application/ld+json">
        {JSON.stringify(faqLd)}
      </Script>
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
            <li className="text-gray-900 font-semibold">FAQ</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <article className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Câu hỏi thường gặp (FAQ)</h1>
              <p className="mt-2 text-gray-700">
                Tổng hợp các câu hỏi phổ biến của khách hàng
              </p>
            </header>

            <div className="space-y-4">
              {faqs.map((item, i) => (
                <details key={i} className="group rounded-xl border bg-white p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-gray-900">
                    <span>{item.q}</span>
                    <span className="ml-4 rounded-md border px-2 py-1 text-sm text-gray-500 group-open:rotate-180 transition">
                      ▼
                    </span>
                  </summary>
                  <p className="mt-3 text-gray-700">{item.a}</p>
                </details>
              ))}
            </div>

            <div className="mt-8 p-6 rounded-xl bg-amber-50 border border-amber-200">
              <h2 className="text-xl font-bold text-amber-800 mb-2">Không tìm thấy câu trả lời?</h2>
              <p className="text-gray-700 mb-4">
                Liên hệ với chúng tôi qua hotline, email hoặc chat trực tuyến để được hỗ trợ nhanh chóng.
              </p>
              <div className="flex gap-3">
                <Link href="/support/chat" className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 font-semibold text-white hover:bg-amber-700">
                  Chat ngay
                </Link>
                <Link href="/contact" className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 hover:bg-gray-50">
                  Liên hệ
                </Link>
              </div>
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
              <div className="mt-6 grid gap-2">
                <Link href="/support/chat" className="rounded-lg bg-amber-600 px-3 py-2 text-center font-semibold text-white hover:bg-amber-700">
                  💬 Chat ngay
                </Link>
                <Link href="/support/khieu-nai" className="rounded-lg border px-3 py-2 text-center hover:bg-gray-50">
                  Khiếu nại
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}


