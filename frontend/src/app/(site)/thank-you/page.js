"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function ThankYouPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef(null);

  const orderId = sp.get("orderId") || "";
  const code    = sp.get("code") || "";

  // Confetti đơn giản (3s)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let w = (canvas.width = window.innerWidth);
    let h = (canvas.height = window.innerHeight);

    const onResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const colors = ["#FF6B6B","#FFD93D","#6BCB77","#4D96FF","#B980F0","#FF8FAB"];
    const pieces = Array.from({ length: 140 }).map(() => ({
      x: Math.random() * w,
      y: -20 - Math.random() * h * 0.4,
      r: 4 + Math.random() * 6,
      c: colors[Math.floor(Math.random() * colors.length)],
      vx: -2 + Math.random() * 4,
      vy: 2 + Math.random() * 3.5,
      rot: Math.random() * Math.PI,
      vr: -0.2 + Math.random() * 0.4,
    }));

    let start = performance.now();
    let rafId;

    const draw = (t) => {
      const dt = (t - start) / 1000;
      ctx.clearRect(0, 0, w, h);
      pieces.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        if (p.y > h + 10) {
          p.y = -20; p.x = Math.random() * w;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2 * 0.6);
        ctx.restore();
      });
      // tắt dần sau ~3s
      if (dt < 3.2) {
        rafId = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, w, h);
      }
    };
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <main className="relative">
      {/* Confetti canvas */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-10"
        aria-hidden="true"
      />

      <div className="max-w-2xl mx-auto px-6 py-14">
        <div className="rounded-2xl border bg-white p-8 shadow-sm animate-enter">
          {/* Tick vẽ nét */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg viewBox="0 0 52 52" className="h-8 w-8">
              <circle className="check__circle" cx="26" cy="26" r="24" fill="none"/>
              <path className="check__tick" fill="none" d="M14 27 l8 8 l16 -16"/>
            </svg>
          </div>

          <h1 className="mt-4 text-2xl font-semibold text-center">Đặt hàng thành công!</h1>
          <p className="mt-3 text-gray-600 text-center">
            Cảm ơn bạn đã mua hàng. Chúng mình sẽ liên hệ để xác nhận và giao sớm nhất.
          </p>

          {(orderId || code) && (
            <div className="mt-5 rounded-lg border bg-gray-50 p-4 text-sm animate-fade">
              {orderId && (
                <div>
                  <span className="font-medium">Mã đơn (ID):</span> {orderId}
                </div>
              )}
              {code && (
                <div>
                  <span className="font-medium">Mã tham chiếu:</span> {code}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="rounded-lg bg-black px-4 py-2.5 text-white font-medium transition-all duration-200 hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
            >
              Về trang chủ
            </button>
            <button
              onClick={() => router.push("/product")}
              className="rounded-lg border px-4 py-2.5 font-medium transition-all duration-200 hover:bg-gray-50 hover:-translate-y-0.5 active:translate-y-0"
            >
              Tiếp tục mua sắm
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        .animate-enter {
          animation: enter 500ms ease-out both;
        }
        .animate-fade {
          animation: fade 700ms 200ms ease-out both;
        }
        @keyframes enter {
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes fade {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Tick drawing */
        .check__circle {
          stroke: #22c55e;
          stroke-width: 2;
          stroke-dasharray: 160;
          stroke-dashoffset: 160;
          animation: draw 800ms ease-out forwards;
        }
        .check__tick {
          stroke: #22c55e;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: draw 700ms 300ms ease-out forwards;
        }
        @keyframes draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </main>
  );
}
