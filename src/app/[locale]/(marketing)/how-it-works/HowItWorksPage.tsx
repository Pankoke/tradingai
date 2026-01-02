import type { JSX } from "react";
import type { Locale } from "@/src/lib/i18n/config";
import { getContent } from "./content";
import { HeroSection } from "./sections/HeroSection";
import { TableOfContents } from "./sections/TableOfContents";
import { PipelineSection } from "./sections/PipelineSection";
import { DataSourcesSection } from "./sections/DataSourcesSection";
import { ProfilesSection } from "./sections/ProfilesSection";
import { LevelsSection } from "./sections/LevelsSection";
import { RingsSection } from "./sections/RingsSection";
import { RankingSection } from "./sections/RankingSection";
import { ExampleSection } from "./sections/ExampleSection";
import { FaqSection } from "./sections/FaqSection";

type HowItWorksPageProps = {
  locale: Locale;
};

export function HowItWorksPage({ locale }: HowItWorksPageProps): JSX.Element {
  const content = getContent(locale);

  return (
    <div className="bg-background text-foreground">
      <main className="mx-auto max-w-6xl scroll-smooth px-4 py-10 md:py-12">
        <HeroSection
          title={content.heroTitle}
          subtitle={content.heroSubtitle}
          highlights={content.heroHighlights}
        />

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-10">
            <TableOfContents
              items={content.tocItems}
              title={content.tocLabel}
              mobileTitle={content.mobileTocLabel}
              showDesktop={false}
            />

            <PipelineSection
              title={content.pipelineTitle}
              intro={content.pipelineIntro}
              steps={content.pipelineSteps}
              labels={content.labels}
            />

            <DataSourcesSection
              title={content.dataSourcesTitle}
              intro={content.dataSourcesIntro}
              items={content.dataSources}
              labels={content.dataSourcesLabels}
            />

            <ProfilesSection
              title={content.profilesTitle}
              intro={content.profilesIntro}
              profiles={content.profiles}
              labels={content.profileLabels}
            />

            <LevelsSection
              title={content.levelsTitle}
              intro={content.levelsIntro}
              concepts={content.levelConcepts}
              diagramLabels={content.levelDiagramLabels}
              rrrLine={content.rrrLine}
            />

            <RingsSection
              title={content.ringsTitle}
              intro={content.ringsIntro}
              rings={content.rings}
              qualityNote={content.ringsQualityNote}
              transparencyLabel={content.transparencyAnchorLabel}
              labels={content.ringLabels}
            />

            <RankingSection
              title={content.rankingTitle}
              intro={content.rankingIntro}
              listTitle={content.rankingListTitle}
              examples={content.rankingExamples}
              scoreLabel={content.labels.score}
            />

            <ExampleSection
              title={content.exampleTitle}
              intro={content.exampleIntro}
              steps={content.exampleSteps}
              eventNote={content.exampleEventNote}
              labels={{ step: content.labels.step, example: content.labels.example }}
            />

            <FaqSection title={content.faqTitle} intro={content.faqIntro} items={content.faqItems} />
          </div>

          <TableOfContents
            items={content.tocItems}
            title={content.tocLabel}
            mobileTitle={content.mobileTocLabel}
            showMobile={false}
          />
        </div>
      </main>
    </div>
  );
}
