import type { Appearance } from "@clerk/types";

// Design-tuned Clerk appearance aligned with the app's dark theme tokens.
export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "iconButton",
    shimmer: true,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  variables: {
    colorPrimary: "var(--accent)",
    colorBackground: "var(--bg-elevated)",
    colorText: "var(--text-primary)",
    colorTextSecondary: "var(--text-muted)",
    colorInputBackground: "var(--bg-surface)",
    colorInputText: "var(--text-primary)",
    colorBorder: "var(--border-subtle)",
    borderRadius: "16px",
    fontSize: "14px",
    fontFamily: "Inter, system-ui, -apple-system, sans-serif",
  },
  elements: {
    card: "bg-[var(--bg-surface)]/90 backdrop-blur border border-[var(--border-subtle)] shadow-xl shadow-black/30 rounded-2xl",
    headerTitle: "text-[var(--text-primary)] text-xl font-semibold",
    headerSubtitle: "text-[var(--text-muted)]",
    formFieldInput:
      "bg-[var(--bg-main)] border-[var(--border-subtle)] text-[var(--text-primary)] rounded-xl focus:border-[var(--accent)] focus:ring-0",
    formFieldLabel: "text-[var(--text-secondary)]",
    button:
      "rounded-xl border border-transparent bg-[var(--accent)] text-black font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.2)] hover:opacity-95 transition",
    socialButtonsBlockButton:
      "rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-main)] text-[var(--text-primary)] hover:border-[var(--accent)] hover:bg-[var(--bg-surface)] transition",
    footer: "text-[var(--text-muted)]",
    formButtonPrimary:
      "rounded-xl bg-[var(--accent)] text-black font-semibold shadow-[0_12px_40px_rgba(0,0,0,0.2)] hover:opacity-95 transition disabled:opacity-70 disabled:text-[var(--text-secondary)]",
    formButtonPrimary__icon: "text-[color:var(--text-primary)]",
    identityPreviewMainIdentifier: "text-[var(--text-primary)]",
    identityPreviewEditButtonIcon: "text-[var(--text-muted)]",
  },
};
