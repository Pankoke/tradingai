"use client";

import React from "react";
import { ClerkProvider } from "@clerk/nextjs";

type ClerkRootProviderProps = {
  children: React.ReactNode;
};

export function ClerkRootProvider({ children }: ClerkRootProviderProps): React.ReactElement {
  return <ClerkProvider>{children}</ClerkProvider>;
}
