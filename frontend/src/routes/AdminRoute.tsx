import React from "react";
import { Navigate } from "react-router-dom";
import { useMe } from "../state/me";

export function AdminRoute({ children }: { children: React.ReactElement }) {
  const { me } = useMe();

  const isAdmin = !!me?.roles?.includes("ADMIN");

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
