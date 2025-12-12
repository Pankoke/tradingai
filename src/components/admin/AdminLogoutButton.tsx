"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  locale?: string;
};

export function AdminLogoutButton({ locale }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace(locale ? `/${locale}/admin/login` : "/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-rose-400 hover:text-rose-200 disabled:opacity-50"
    >
      Logout
    </button>
  );
}
