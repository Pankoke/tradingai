"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type Props = {
  locale: string;
  redirectTo?: string;
};

export function AdminLoginForm({ locale, redirectTo }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "Login fehlgeschlagen");
        return;
      }
      router.replace(redirectTo ?? `/${locale}/admin`);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-semibold text-slate-200" htmlFor="password">
          Admin-Passwort
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm placeholder-slate-500 focus:border-sky-400 focus:outline-none"
        />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:opacity-50"
      >
        {submitting ? "Wird geprüft…" : "Einloggen"}
      </button>
    </form>
  );
}
