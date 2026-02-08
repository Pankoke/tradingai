import type { Locale } from "@/i18n";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";
import { AdminSectionHeader } from "@/src/components/admin/AdminSectionHeader";
import { buildCatalogRelatedLinks } from "@/src/components/admin/relatedLinks";
import { CsvImportPanel } from "@/src/components/admin/import/CsvImportPanel";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AdminEventsImportPage({ params }: Props) {
  const resolved = await params;
  const locale = resolved.locale as Locale;
  const messages = locale === "de" ? deMessages : enMessages;
  const related = buildCatalogRelatedLinks(locale, {
    assets: messages["admin.nav.assets"],
    events: messages["admin.nav.events"],
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        title={messages["admin.events.importCsv"]}
        description={messages["admin.import.eventsDescription"]}
        relatedLabel={messages["admin.section.related"]}
        links={related}
        currentKey="events"
        variant="warning"
        notice={messages["admin.import.dryRunNotice"]}
      />
      <CsvImportPanel
        previewEndpoint="/api/admin/events/import/preview"
        applyEndpoint="/api/admin/events/import/apply"
        sampleHeaders="eventId,title,category,impact,country,source,scheduledAt,description"
        labels={{
          upload: messages["admin.import.upload"],
          dryRun: messages["admin.import.dryRun"],
          preview: messages["admin.import.preview"],
          apply: messages["admin.import.apply"],
          confirmApply: messages["admin.import.confirmApply"],
          errorsFix: messages["admin.import.errorsFix"],
          previewMismatch: messages["admin.import.previewMismatch"],
          sampleHeaders: messages["admin.import.sampleHeaders"],
          summaryRows: messages["admin.import.summary.rows"],
          summaryCreates: messages["admin.import.summary.creates"],
          summaryUpdates: messages["admin.import.summary.updates"],
          summarySkips: messages["admin.import.summary.skips"],
          summaryErrors: messages["admin.import.summary.errors"],
        }}
      />
    </div>
  );
}
