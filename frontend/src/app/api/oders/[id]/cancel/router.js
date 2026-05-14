// src/app/api/orders/[id]/cancel/route.js

const log = (...args) => console.log("[API] cancel:", ...args);

// TODO: thay bằng truy vấn DB thực tế
async function cancelOrderInDB(id) {
  // ví dụ: cho hủy thành công
  return { ok: true, id, newStatus: "cancelled" };
}

// GET chỉ để test nhanh trên trình duyệt (có thể xóa)
export async function GET(_req, { params }) {
  const p = await params;
  log("GET", p.id);
  return new Response(
    JSON.stringify({ ok: true, id: p.id, hint: "Use POST to cancel order." }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

// POST: hủy đơn
export async function POST(_req, { params }) {
  const p = await params;
  log("POST", p.id);

  const result = await cancelOrderInDB(p.id);
  if (!result.ok) {
    return new Response(JSON.stringify({ ok: false, message: "Cannot cancel" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
