import type { ReactNode } from "react";

export default function AdminAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-12 text-slate-50">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
        {children}
      </div>
    </div>
  );
}
