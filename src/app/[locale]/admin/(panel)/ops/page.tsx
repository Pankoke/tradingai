import { OpsActionsPanel } from "@/src/components/admin/OpsActionsPanel";
import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminOpsPage({ params }: Props) {
  const resolvedParams = await params;
  const locale = resolvedParams.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;

  const opsMessages = {
    title: messages["admin.ops.title"],
    description: messages["admin.ops.description"],
    disabledLabel: messages["admin.ops.disabledInProd"],
    perception: {
      title: messages["admin.ops.perception.title"],
      description: messages["admin.ops.perception.description"],
      button: messages["admin.ops.perception.button"],
    },
    marketdata: {
      title: messages["admin.ops.marketdata.title"],
      description: messages["admin.ops.marketdata.description"],
      button: messages["admin.ops.marketdata.button"],
      symbolLabel: messages["admin.ops.marketdata.symbolLabel"],
      symbolPlaceholder: messages["admin.ops.marketdata.symbolPlaceholder"],
      runAllLabel: messages["admin.ops.marketdata.runAllLabel"],
    },
    bias: {
      title: messages["admin.ops.bias.title"],
      description: messages["admin.ops.bias.description"],
      button: messages["admin.ops.bias.button"],
    },
    status: {
      idle: messages["admin.ops.status.idle"],
      running: messages["admin.ops.status.running"],
      success: messages["admin.ops.status.success"],
      error: messages["admin.ops.status.error"],
      lastRun: messages["admin.ops.status.lastRun"],
      duration: messages["admin.ops.status.duration"],
      output: messages["admin.ops.status.output"],
      none: messages["admin.ops.status.none"],
    },
    common: {
      showDetails: messages["admin.common.showJson"],
      hideDetails: messages["admin.common.hideJson"],
    },
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Admin</p>
        <h1 className="text-3xl font-semibold text-white">{opsMessages.title}</h1>
        <p className="text-sm text-slate-400">{opsMessages.description}</p>
      </header>
      <OpsActionsPanel locale={locale} messages={opsMessages} />
    </div>
  );
}
