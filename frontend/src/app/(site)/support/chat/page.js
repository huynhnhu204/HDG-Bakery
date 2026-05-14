"use client";

import Link from "next/link";
import Script from "next/script";
import { useState, useRef, useEffect } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Xin chào! Tôi là trợ lý của Dola Bakery. Bạn cần hỗ trợ gì hôm nay? 😊",
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: "/" },
      { "@type": "ListItem", position: 2, name: "Chat trực tuyến", item: "/support/chat" },
    ],
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      role: "user",
      text: input,
      time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    };

    setMessages([...messages, userMessage]);
    setInput("");
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      const responses = [
        "Cảm ơn bạn đã liên hệ! Để được hỗ trợ tốt nhất, bạn có thể:",
        "📞 Gọi hotline: 1900 6750 (miễn phí)",
        "✉️ Email: heyzun@support.vn",
        "📍 Đến trực tiếp: 70 Lữ Gia, Q.11, TP.HCM",
        "Nhân viên của chúng tôi sẽ phản hồi trong vòng 15 phút!",
        "Bạn có muốn biết thêm thông tin gì không? 😊"
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, {
        role: "bot",
        text: randomResponse,
        time: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const quickReplies = [
    "Cách đặt hàng?",
    "Phí giao hàng?",
    "Thời gian giao hàng?",
    "Phương thức thanh toán?"
  ];

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
            <li className="text-gray-900 font-semibold">Chat</li>
          </ol>
        </div>
      </nav>

      <section className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <header className="mb-6">
              <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">Chat trực tuyến</h1>
              <p className="mt-2 text-gray-700">
                Trò chuyện với chúng tôi ngay bây giờ
              </p>
            </header>

            <div className="bg-white border rounded-2xl overflow-hidden shadow-lg flex flex-col" style={{ height: "600px" }}>
              {/* Chat Header */}
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">Dola Bakery Support</h3>
                  <p className="text-sm opacity-90">Trực tuyến</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-amber-700 rounded">
                    <span className="text-xl">📞</span>
                  </button>
                  <a href="tel:19006750" className="p-2 hover:bg-amber-700 rounded">
                    <span className="text-xl">💬</span>
                  </a>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[70%] ${
                      msg.role === "user"
                        ? "bg-amber-600 text-white rounded-t-xl rounded-br-xl"
                        : "bg-white border rounded-t-xl rounded-bl-xl"
                    } px-4 py-3 shadow-sm`}>
                      <p className="text-sm">{msg.text}</p>
                      <p className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-amber-100" : "text-gray-400"
                      }`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white border rounded-t-xl rounded-bl-xl px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Replies */}
              {messages.length === 1 && (
                <div className="px-6 pb-2">
                  <div className="flex flex-wrap gap-2">
                    {quickReplies.map((reply, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(reply)}
                        className="px-3 py-1.5 text-xs bg-white border rounded-full hover:bg-amber-50 text-gray-700"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <form onSubmit={handleSend} className="p-4 border-t bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <button
                    type="submit"
                    className="px-6 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700"
                  >
                    Gửi
                  </button>
                </div>
              </form>
            </div>
          </div>

          <aside className="lg:col-span-1">
            <div className="lg:sticky lg:top-20 rounded-2xl border bg-white p-6 shadow-sm">
              <h3 className="mb-4 text-lg font-bold text-gray-900">Liên hệ khác</h3>
              <div className="space-y-3">
                <a href="tel:19006750" className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition">
                  <span className="text-2xl">📞</span>
                  <div className="text-sm">
                    <div className="font-semibold">Hotline</div>
                    <div className="text-gray-600">1900 6750</div>
                  </div>
                </a>
                <a href="mailto:heyzun@support.vn" className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition">
                  <span className="text-2xl">✉️</span>
                  <div className="text-sm">
                    <div className="font-semibold">Email</div>
                    <div className="text-gray-600 text-xs">heyzun@support.vn</div>
                  </div>
                </a>
              </div>
              <div className="mt-6">
                <Link href="/support/faq" className="block w-full text-center rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                  📚 FAQ
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}


