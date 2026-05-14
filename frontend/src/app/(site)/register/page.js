"use client";

import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf7f2]">
      <div className="w-full max-w-2xl">
        <RegisterForm />
      </div>
    </div>
  );
}
