TradingAI – Perception Lab

TradingAI ist eine KI-gestützte Trading-Plattform, die täglich regelbasierte und KI-basierte Setups generiert. Kern des Systems ist eine Setup-Engine, die Marktstruktur, Bias, Sentiment und Events auswertet, daraus Trades ableitet und sie mit Confidence-Scores, Entry/SL/TP und klaren Erklärungen versieht.

Dieses Repository enthält die Web-App (Next.js App Router) inklusive UI, API-Routen, Cron-Endpunkten und der modularen Perception-Engine.

Ziele des Projekts

Tägliche Setups für wichtige Assets

Kombination aus regelbasierten Signalen und KI-Auswertung

Klar verständliche "Setup des Tages"-Ansicht

Free-Tier und Premium-Tier

Dark/Light Theme mit Design-Tokens

Deutsch/Englisch Umschaltung (i18n)

Kernfunktionen

Setup-Engine:

Analyse von Marktstruktur, Events, Sentiment, Volumen

Scoring-System für Setups

Entry, Stop-Loss, Take-Profit

KI-generierte Kurzbegründungen

UI:

Landing Page mit Setup des Tages

Premium-Ansicht mit 20–40 Setups pro Tag

Setup-Detailseiten

Dark/Light-Theme

Sprachumschalter DE/EN

Premium:

Alle Setups

Historie

Alerts (E-Mail / Push)

Favoriten und Trading-Journal

Infra:

Cron-Jobs zur täglichen Snapshot-Erzeugung

Cache-Schicht (z. B. Redis)

Saubere Trennung zwischen UI und Logik

Tech-Stack

Next.js App Router

TypeScript strict

Tailwind CSS

Feature-Architektur

Zod (geplant)

Redis (geplant)

Vitest (Tests geplant)

Projektstruktur (Kurzüberblick)

src/app: UI, Routing, API-Routen
src/features: Setup-Engine, KI-Module, Cache
src/server: Redis, DB, Auth
src/lib: Logger, Utils, Intl
src/styles: Themes
schemas und types: Zod-Schemas & Domain-Typen
tests: Engine-/API-/UI-Tests

Getting Started

Repository klonen, dann:

npm install
npm run dev

Die App läuft unter http://localhost:3000

Tests

npm test

Env-Variablen (geplant)

REDIS_URL
DATABASE_URL
AUTH_SECRET
API-Keys für Datenquellen / KI

Roadmap

UI der Referenzseite umsetzen

Mock-Daten integrieren

Perception-API und Cron

Snapshot-System

Free/Premium

Alerts

Erweiterte Setup-Typen & Sprachen

Disclaimer

TradingAI stellt keine Finanzberatung dar.
Alle Setups dienen nur der Information.
Trading ist mit Risiken verbunden.

Neon + Drizzle

1. Lege ein neues Neon Postgres-Projekt an und kopiere den dort angezeigten Connection-String.
2. Trage den Connection-String als `DATABASE_URL` in `.env.local` ein.
3. Verwende denselben Wert in den Vercel-Umgebungsvariablen (Preview und Production).
4. Führe `npx drizzle-kit push` aus, um die Schema-Definitionen in Neon anzuwenden.
