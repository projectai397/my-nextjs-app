"use client";
import { useEffect, useState } from "react";

export type Role = "superadmin" | "master" | "unknown";

function detectRoleFromLS(): Role {
  try {
    const direct = localStorage.getItem("role");
    if (direct) {
      const r = direct.toLowerCase();
      if (r.includes("super")) return "superadmin";
      if (r.includes("master")) return "master";
    }
    const authStr = localStorage.getItem("authenticated");
    if (authStr) {
      const auth = JSON.parse(authStr);
      const roleName: string | undefined =
        auth?.user?.roleName || auth?.roleName || auth?.role?.name;
      if (roleName) {
        const r = roleName.toLowerCase();
        if (r.includes("super")) return "superadmin";
        if (r.includes("master")) return "master";
      }
    }
  } catch {}
  return "unknown";
}

export function useRole(): Role {
  const [role, setRole] = useState<Role>("unknown");
  useEffect(() => setRole(detectRoleFromLS()), []);
  return role;
}
