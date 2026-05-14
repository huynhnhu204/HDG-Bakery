import { NextResponse } from "next/server";

// demo in-memory
const USERS = new Map();

export async function POST(req) {
  try {
    const { name, email, phone, password } = await req.json();
    if (!name || !email || !password) {
      return NextResponse.json({ message: "Thiếu thông tin bắt buộc." }, { status: 400 });
    }
    if (USERS.has(email)) {
      return NextResponse.json({ message: "Email đã tồn tại." }, { status: 409 });
    }
    USERS.set(email, { name, email, phone: phone || "", passwordHash: password }); // TODO: hash
    return NextResponse.json({ ok: true, user: { name, email, phone: phone || "" } }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Lỗi máy chủ." }, { status: 500 });
  }
}
