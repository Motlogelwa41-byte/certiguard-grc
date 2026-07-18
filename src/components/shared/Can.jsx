import React from "react";
import { useRBAC } from "@/lib/useRBAC";

/**
 * Permission gate — renders children only if the current user's role
 * has the given permission (per useRBAC). Use to hide UI actions a role
 * is not authorized to perform.
 *
 *   <Can permission="controls:delete"><Button>Delete</Button></Can>
 */
export default function Can({ permission, children, fallback = null }) {
  const { can } = useRBAC();
  if (!can(permission)) return fallback;
  return <>{children}</>;
}