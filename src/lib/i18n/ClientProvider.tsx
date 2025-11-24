"use client";

import React, { createContext, useContext } from "react";
import type { ReactNode, JSX } from "react";

type Messages = Record<string, string>;

const I18nContext = createContext<Messages>({});

function getMessage(messages: Messages, key: string): string {
  if (messages[key]) return messages[key];
  if (key.includes(".")) {
    const parts = key.split(".");
    let current: any = messages;
    for (const part of parts) {
      current = current?.[part];
      if (!current) break;
    }
    if (typeof current === "string") return current;
  }
  return key;
}

export function ClientI18nProvider({
  messages,
  children,
}: {
  messages: Messages;
  children: ReactNode;
}): JSX.Element {
  return <I18nContext.Provider value={messages}>{children}</I18nContext.Provider>;
}

export function useT(): (key: string) => string {
  const messages = useContext(I18nContext);
  return (key: string) => getMessage(messages, key);
}
