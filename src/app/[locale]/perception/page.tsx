import { redirect } from "next/navigation";
import type { Locale } from "@/src/lib/i18n/config";

type PageProps = {
  params: { locale: Locale };
};

export default function LegacyPerceptionPage({ params }: PageProps): never {
  redirect(`/${params.locale}/how-it-works`);
}
