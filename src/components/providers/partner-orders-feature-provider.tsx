"use client";

import { createContext, useContext } from "react";

const PartnerOrdersFeatureContext = createContext(false);

export function PartnerOrdersFeatureProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <PartnerOrdersFeatureContext.Provider value={enabled}>
      {children}
    </PartnerOrdersFeatureContext.Provider>
  );
}

export function usePartnerOrdersEnabled(): boolean {
  return useContext(PartnerOrdersFeatureContext);
}
