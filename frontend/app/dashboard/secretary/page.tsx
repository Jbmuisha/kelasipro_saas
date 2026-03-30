"use client";
import { useEffect, useState } from "react";

export default function SecretaryDashboard() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>👋 Bienvenue, {user?.name || "Secrétaire"}</h1>
      <p style={{ color: "#666", marginBottom: 30 }}>
        Tableau de bord du secrétaire. Gérez les élèves et leurs parents.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 30 }}>
        <a href="/dashboard/secretary/students" style={{
          background: "linear-gradient(135deg, #6a11cb, #2575fc)", color: "#fff",
          borderRadius: 16, padding: 24, textDecoration: "none",
          boxShadow: "0 8px 24px rgba(37,117,252,0.2)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Élèves</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Ajouter des élèves par classe avec leurs parents</div>
        </a>
        <a href="/dashboard/secretary/profile" style={{
          background: "linear-gradient(135deg, #2c3e50, #3498db)", color: "#fff",
          borderRadius: 16, padding: 24, textDecoration: "none",
          boxShadow: "0 8px 24px rgba(52,152,219,0.2)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Mon Profil</div>
          <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>Modifier votre mot de passe et photo de profil</div>
        </a>
      </div>

      <div style={{
        background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14,
        padding: 18, fontSize: 14, color: "#1e40af", lineHeight: 1.6,
      }}>
        <strong>ℹ️ Votre rôle :</strong><br />
        • Ajouter des <strong>élèves</strong> dans chaque classe<br />
        • Créer le <strong>parent</strong> de chaque élève et le lier<br />
        • Un mot de passe par défaut est créé — l&apos;élève/parent peut le changer après connexion<br />
        • Chaque élève/parent reçoit un <strong>ID de connexion</strong> (ex: 2026xxx)
      </div>
    </div>
  );
}
