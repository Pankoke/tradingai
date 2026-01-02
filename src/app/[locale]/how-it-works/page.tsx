import type { JSX } from "react";
import type { Locale } from "@/src/lib/i18n/config";
import { HowItWorksPage } from "@/src/app/[locale]/(marketing)/how-it-works/HowItWorksPage";

type PageProps = {
  params: { locale: Locale };
};

export default function Page({ params }: PageProps): JSX.Element {
  return <HowItWorksPage locale={params.locale} />;
}
