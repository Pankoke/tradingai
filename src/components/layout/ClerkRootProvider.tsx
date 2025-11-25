"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

type ClerkRootProviderProps = {
  children: React.ReactNode;
};

export function ClerkRootProvider({ children }: ClerkRootProviderProps): JSX.Element {
  return <ClerkProvider>{children}</ClerkProvider>;
}
