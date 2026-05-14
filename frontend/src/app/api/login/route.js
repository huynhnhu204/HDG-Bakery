import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ message: "Email không hợp lệ." }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ message: "Mật khẩu tối thiểu 6 ký tự." }, { status: 400 });
    }

    // DEMO: luôn ok, trả token giả
    const token = "demo-token-" + Math.random().toString(36).slice(2);
    return NextResponse.json(
      { ok: true, token, user: { email } },
      { status: 200 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Lỗi máy chủ." }, { status: 500 });
  }
}
