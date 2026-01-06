import { createContext, useContext, useState } from "react";

export type Me = { id: number; email: string | null; displayName: string | null };

type MeCtx = {
  me: Me | null;
  setMe: React.Dispatch<React.SetStateAction<Me | null>>;
};

const MeContext = createContext<MeCtx | null>(null);

export function MeProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  return <MeContext.Provider value={{ me, setMe }}>{children}</MeContext.Provider>;
}

export function useMe() {
  const ctx = useContext(MeContext);
  if (!ctx) throw new Error("useMe must be used within MeProvider");
  return ctx;
}
