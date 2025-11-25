"use client";

import React, { createContext, useContext } from "react";
import type { ReactNode, JSX } from "react";

interface Messages {
  [key: string]: string | Messages;
}

const I18nContext = createContext<Messages>({});

function getMessage(messages: Messages, key: string): string {
  const direct = messages[key];
  if (typeof direct === "string") return direct;

  if (key.includes(".")) {
    const parts = key.split(".");
    let current: string | Messages | undefined = messages;
    for (const part of parts) {
      if (typeof current !== "object" || current === null) {
        current = undefined;
        break;
      }
      current = current[part] as string | Messages | undefined;
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
