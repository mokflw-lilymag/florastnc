"use client";

import { createContext, useContext, type ReactNode } from "react";
import { installAppMessages } from "@/i18n/getMessages";
import type { AppMessages } from "@/i18n/types";

const MessagesContext = createContext<AppMessages | null>(null);

export function MessagesProvider({
  messages,
  children,
}: {
  messages: AppMessages;
  children: ReactNode;
}) {
  installAppMessages(messages);
  return (
    <MessagesContext.Provider value={messages}>{children}</MessagesContext.Provider>
  );
}

export function useAppMessages(): AppMessages {
  const ctx = useContext(MessagesContext);
  if (ctx) return ctx;
  throw new Error("MessagesProvider is missing. Wrap the route tree with MessagesProvider.");
}
