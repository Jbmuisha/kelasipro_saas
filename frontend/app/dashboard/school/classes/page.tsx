"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClassesIndexRedirect() {
  const router = useRouter();

  useEffect(() => {
    try {
      const userStr = window.localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const lockedLevel = user?.role === "SCHOOL_ADMIN" ? user?.admin_level : null;
      const st = (lockedLevel || window.localStorage.getItem("school_type") || "primaire").toLowerCase();

      if (st.includes("second")) {
        router.replace("/dashboard/school/secondaire/classes");
        return;
      }
      if (st.includes("matern")) {
        router.replace("/dashboard/school/maternelle/classes");
        return;
      }
      router.replace("/dashboard/school/primaire/classes");
    } catch {
      router.replace("/dashboard/school/primaire/classes");
    }
  }, [router]);

  return null;
}
