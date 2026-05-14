"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "");

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  
  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    
    // Handle redirect từ backend
    if (success === '1') {
      setStatus("success");
      setMessage("Xác thực email thành công!");
      setTimeout(() => router.push("/login"), 3000);
      return;
    }
    
    if (error) {
      setStatus("error");
      if (error === 'notfound') {
        setMessage("Không tìm thấy tài khoản!");
      } else if (error === 'invalid') {
        setMessage("Link xác thực không hợp lệ hoặc đã hết hạn!");
      } else {
        setMessage("Lỗi hệ thống. Vui lòng thử lại sau.");
      }
      return;
    }
    
    // Handle direct verify API call (nếu có uid và token)
    if (uid && token) {
      setStatus("verifying");
      verifyEmail(uid, token);
    } else {
      setStatus("error");
      setMessage("Link xác thực không hợp lệ!");
    }
  }, [searchParams, router]);
  
  async function verifyEmail(uid, token) {
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/verify?uid=${uid}&token=${token}`);
      const data = await res.json();
      
      if (!res.ok) {
        setStatus("error");
        setMessage(data.message || "Xác thực thất bại!");
        return;
      }
      
      setStatus("success");
      setMessage(data.message || "Xác thực email thành công!");
      
      setTimeout(() => router.push("/login"), 3000);
    } catch (err) {
      setStatus("error");
      setMessage("Lỗi kết nối. Vui lòng thử lại sau.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2] p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {(status === "loading" || status === "verifying") && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Đang xác thực...</h1>
            <p className="text-gray-600">Vui lòng đợi trong giây lát</p>
          </>
        )}
        
        {status === "success" && (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thành công!</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Đang chuyển hướng đến trang đăng nhập...</p>
          </>
        )}
        
        {status === "error" && (
          <>
            <div className="mb-4">
              <svg className="mx-auto h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thất bại</h1>
            <p className="text-gray-600 mb-4">{message}</p>
            <div className="space-y-2">
              <Link 
                href="/login"
                className="inline-block w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium transition"
              >
                Đi đến trang đăng nhập
              </Link>
              <Link 
                href="/register"
                className="inline-block w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition"
              >
                Đăng ký lại
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

