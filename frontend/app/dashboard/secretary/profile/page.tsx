"use client";
import { useEffect, useState } from "react";
import ProfileCard from "@/components/ProfileCard";

export default function SecretaryProfilePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  if (!user) return <p style={{ textAlign: "center", padding: 40 }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 20 }}>
      <ProfileCard
        user={user}
        editable
        onImageUpdated={(url) => {
          const updated = { ...user, profile_image: url };
          setUser(updated);
          localStorage.setItem("user", JSON.stringify(updated));
        }}
      />
    </div>
  );
}
