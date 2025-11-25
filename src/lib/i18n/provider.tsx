import React, { createContext, useContext } from "react";
import type { JSX, ReactNode } from "react";
import deMessages from "@/src/messages/de.json";
import enMessages from "@/src/messages/en.json";

type Messages = typeof deMessages;

export type MessageKey = keyof typeof deMessages | keyof typeof enMessages;

const I18nContext = createContext<Messages | null>(null);

function getMessage(messages: Messages, key: MessageKey): string {
  const value = messages[key as keyof Messages];
  return typeof value === "string" ? value : key;
}

export function I18nProvider({ messages, children }: { messages: Messages; children: ReactNode }): JSX.Element {
  return <I18nContext.Provider value={messages}>{children}</I18nContext.Provider>;
}

export function useT(): (key: MessageKey) => string {
  const messages = useContext(I18nContext);
  if (!messages) {
    throw new Error("useT must be used within an I18nProvider");
  }
  return (key: MessageKey) => getMessage(messages, key);
}
