"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { LegalLayout } from "@/src/components/legal/LegalLayout";

export default function PrivacyPage(): JSX.Element {
  const t = useT();

  return (
    <LegalLayout activeTab="privacy">
      <section className="space-y-6">
        {/* Verantwortliche Stelle */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.responsibleTitle")}
          </h2>
          <p>{t("legal.privacy.responsibleText")}</p>
          <p>
            <span className="font-semibold">
              {t("legal.privacy.providerLabel")}
            </span>{" "}
            {/* TODO: mit deinen echten Daten ersetzen */}
            Your Name / TradingAI – Perception Lab
          </p>
          <p>
            <span className="font-semibold">
              {t("legal.privacy.emailLabel")}
            </span>{" "}
            hello@tradingai.dev
          </p>
        </section>

        {/* Datenverarbeitung allgemein */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.dataProcessingTitle")}
          </h2>
          <p>{t("legal.privacy.dataProcessingText")}</p>
        </section>

        {/* Login / Clerk */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.loginTitle")}
          </h2>
          <p>{t("legal.privacy.loginText")}</p>
        </section>

        {/* Payment */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.paymentsTitle")}
          </h2>
          <p>{t("legal.privacy.paymentsText")}</p>
        </section>

        {/* Hosting */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.hostingTitle")}
          </h2>
          <p>{t("legal.privacy.hostingText")}</p>
        </section>

        {/* Cookies */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.cookiesTitle")}
          </h2>
          <p>{t("legal.privacy.cookiesText")}</p>
        </section>

        {/* Analytics */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.analyticsTitle")}
          </h2>
          <p>{t("legal.privacy.analyticsText")}</p>
        </section>

        {/* KI-Verarbeitung */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.aiTitle")}
          </h2>
          <p>{t("legal.privacy.aiText")}</p>
        </section>

        {/* Rechte */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.rightsTitle")}
          </h2>
          <p>{t("legal.privacy.rightsText")}</p>
        </section>

        {/* Sicherheit */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.securityTitle")}
          </h2>
          <p>{t("legal.privacy.securityText")}</p>
        </section>

        {/* Speicherdauer */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.retentionTitle")}
          </h2>
          <p>{t("legal.privacy.retentionText")}</p>
        </section>

        {/* Widerruf */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.privacy.revocationTitle")}
          </h2>
          <p>{t("legal.privacy.revocationText")}</p>
        </section>
      </section>
    </LegalLayout>
  );
}
