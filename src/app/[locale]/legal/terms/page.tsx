"use client";

import type { JSX } from "react";
import { useT } from "@/src/lib/i18n/ClientProvider";
import { LegalLayout } from "@/src/components/legal/LegalLayout";

export default function TermsPage(): JSX.Element {
  const t = useT();

  return (
    <LegalLayout activeTab="terms">
      <section className="space-y-6">
        {/* Geltungsbereich / Scope */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.terms.scopeTitle")}
          </h2>
          <p>{t("legal.terms.scopeText")}</p>
        </section>

        {/* Leistungen / Services */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.terms.servicesTitle")}
          </h2>
          <p>{t("legal.terms.servicesText")}</p>
        </section>

        {/* Abos / Payment */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.terms.subscriptionTitle")}
          </h2>
          <p>{t("legal.terms.subscriptionText")}</p>
        </section>

        {/* Haftung */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.terms.liabilityTitle")}
          </h2>
          <p>{t("legal.terms.liabilityText")}</p>
        </section>

        {/* Schlussbestimmungen */}
        <section className="space-y-2">
          <h2 className="text-base font-semibold">
            {t("legal.terms.finalTitle")}
          </h2>
          <p>{t("legal.terms.finalText")}</p>
        </section>
      </section>
    </LegalLayout>
  );
}
