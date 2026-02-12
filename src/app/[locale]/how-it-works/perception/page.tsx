import { redirect } from "next/navigation";
import type { Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: { locale: Locale };
};

export default function LegacyPerceptionDeepDivePage({ params }: PageProps): never {
  redirect(`/${params.locale}/how-it-works`);
}
