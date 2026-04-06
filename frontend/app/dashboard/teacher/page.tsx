"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useEffectiveUser } from "@/utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function TeacherDashboard() {
  const [effectiveUser, effectiveLoading] = useEffectiveUser();
  const [className, setClassName] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (effectiveLoading) return;
  }, [effectiveLoading]);

  useEffect(() => {
    if (!effectiveUser?.id || !effectiveUser?.school_id) { 
      setLoading(false); 
      return; 
    }
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const classRes = await fetch(`${API_URL}/api/classes/?school_id=${effectiveUser.school_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (classRes.ok) {
          const cd = await classRes.json();
          const cls = (cd.classes || []).find((c: any) => c.main_teacher_id === effectiveUser.id);
          if (cls) {
            setClassName(cls.name);
            const usersRes = await fetch(`${API_URL}/api/users/?school_id=${effectiveUser.school_id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (usersRes.ok) {
              const ud = await usersRes.json();
              setStudentCount((ud.users || []).filter((u: any) => u.role === "STUDENT" && String(u.class_id) === String(cls.id)).length);
            }
          }
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [effectiveUser]);

  if (effectiveLoading || loading) {
    return <div style={{ padding: 20 }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      {/* Welcome */}
      <div style={{
        background: "linear-gradient(135deg, #0f4c3a 0%, #10b981 50%, #059669 100%)",
        borderRadius: 20, padding: "28px 28px 24px", color: "#fff", marginBottom: 24,
        boxShadow: "0 12px 40px rgba(16,185,129,0.2)",
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800 }}>
          👋 Bienvenue, {effectiveUser?.name || "Enseignant"}
        </h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Tableau de bord enseignant</p>
        {className && (
          <div style={{ marginTop: 16, display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 14, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{className}</div>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Ma Classe</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 14, padding: "12px 20px", textAlign: "center" }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{loading ? "..." : studentCount}</div>
              <div style={{ fontSize: 11, opacity: 0.8, textTransform: "uppercase", letterSpacing: 1 }}>Élèves</div>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
        <Link href="/dashboard/teacher/classes" style={{
          background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16,
          padding: 20, textDecoration: "none", color: "#111827",
          boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏫</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Ma Classe</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Voir les détails de votre classe</div>
        </Link>

        <Link href="/dashboard/teacher/students" style={{
          background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16,
          padding: 20, textDecoration: "none", color: "#111827",
          boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🎓</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Élèves</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Voir tous les élèves de votre classe</div>
        </Link>

        <Link href="/dashboard/teacher/grades" style={{
          background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16,
          padding: 20, textDecoration: "none", color: "#111827",
          boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
          transition: "transform 0.15s, box-shadow 0.15s",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Notes & Bulletins</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Saisir les notes et générer les bulletins</div>
        </Link>

        <Link href="/dashboard/teacher/attendance" style={{
          background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16,
          padding: 20, textDecoration: "none", color: "#111827",
          boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Présence</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Prendre la présence des élèves</div>
        </Link>

        <Link href="/dashboard/teacher/profile" style={{
          background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16,
          padding: 20, textDecoration: "none", color: "#111827",
          boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
        }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Mon Profil</div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>Modifier votre mot de passe et photo</div>
        </Link>
      </div>
    </div>
  );
}
