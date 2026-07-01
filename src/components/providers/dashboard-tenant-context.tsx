"use client";

import { createContext, useContext, type ReactNode } from "react";

const DashboardStoreNameContext = createContext<string | null>(null);

export function DashboardStoreNameProvider({
  storeName,
  children,
}: {
  storeName?: string | null;
  children: ReactNode;
}) {
  const value = storeName?.trim() || null;
  return (
    <DashboardStoreNameContext.Provider value={value}>
      {children}
    </DashboardStoreNameContext.Provider>
  );
}

/** 서버 layout에서 확정한 매장 표시명 (헤더와 동일) */
export function useDashboardStoreName(): string | null {
  return useContext(DashboardStoreNameContext);
}
