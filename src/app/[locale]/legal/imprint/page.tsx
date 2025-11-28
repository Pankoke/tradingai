"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { LegalLayout } from "@/src/components/legal/LegalLayout";

export default function ImprintPage(): JSX.Element {
  const t = useT();

  return (
    <LegalLayout activeTab="imprint">
      <section className="space-y-4">
        <p className="font-medium">{t("legal.imprint.responsible")}</p>

        <div className="space-y-1">
          <p>
            <span className="font-semibold">
              {t("legal.imprint.providerLabel")}
            </span>{" "}
            Your Name / TradingAI – Perception Lab
          </p>
          <p>
            <span className="font-semibold">
              {t("legal.imprint.addressLabel")}
            </span>{" "}
            Your Street 1
          </p>
          <p>
            <span className="font-semibold">
              {t("legal.imprint.cityLabel")}
            </span>{" "}
            12345 Your City
          </p>
          <p>
            <span className="font-semibold">
              {t("legal.imprint.countryLabel")}
            </span>{" "}
            Germany
          </p>
          <p>
            <span className="font-semibold">
              {t("legal.imprint.emailLabel")}
            </span>{" "}
            hello@tradingai.dev
          </p>
        </div>

        {/* NEW: VAT / Kleinunternehmerregelung */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.vatTitle")}
          </h2>
          <p>{t("legal.imprint.vatText")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.liabilityTitle")}
          </h2>
          <p>{t("legal.imprint.liabilityText")}</p>
        </section>

        {/* NEW: External Links disclaimer */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.externalLinksTitle")}
          </h2>
          <p>{t("legal.imprint.externalLinksText")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.noInvestmentAdviceTitle")}
          </h2>
          <p>{t("legal.imprint.noInvestmentAdviceText")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.mediaLawTitle")}
          </h2>
          <p>{t("legal.imprint.mediaLawText")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.hostingTitle")}
          </h2>
          <p>{t("legal.imprint.hostingText")}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.imprint.disputeTitle")}
          </h2>
          <p>{t("legal.imprint.disputeText")}</p>
        </section>
      </section>
    </LegalLayout>
  );
}
