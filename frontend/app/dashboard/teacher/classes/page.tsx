"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

type ClassInfo = {
  id: number;
  name: string;
  level: string;
  main_teacher_name: string;
  studentCount: number;
};

export default function TeacherClassesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [myClass, setMyClass] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const fetchData = async () => {
    if (!currentUser?.id || !currentUser?.school_id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");

      // Fetch classes
      const classRes = await fetch(`/api/classes?school_id=${currentUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!classRes.ok) throw new Error("Failed to load classes");
      const classData = await classRes.json();
      const cls = (classData.classes || []).find((c: any) => c.main_teacher_id === currentUser.id);

      if (!cls) {
        setMyClass(null);
        setLoading(false);
        return;
      }

      // Count students in this class
      const usersRes = await fetch(`/api/users?school_id=${currentUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      let studentCount = 0;
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        studentCount = (usersData.users || []).filter(
          (u: any) => u.role === "STUDENT" && String(u.class_id) === String(cls.id)
        ).length;
      }

      setMyClass({
        id: cls.id,
        name: cls.name,
        level: cls.level || "",
        main_teacher_name: cls.main_teacher_name || currentUser.name,
        studentCount,
      });
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser?.id) fetchData();
  }, [currentUser]);

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: 20 }}>
      <h2 style={{ marginBottom: 20 }}>🏫 Ma Classe</h2>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>{error}</div>
      )}

      {loading && <p style={{ color: "#6b7280" }}>Chargement...</p>}

      {!loading && !myClass && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
          <p>Aucune classe ne vous est assignée.<br />Contactez l&apos;administrateur de l&apos;école.</p>
        </div>
      )}

      {!loading && myClass && (
        <div style={{
          borderRadius: 20, overflow: "hidden",
          border: "1px solid rgba(17,24,39,0.08)",
          boxShadow: "0 12px 40px rgba(17,24,39,0.08)",
          background: "#fff",
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, #0f4c3a 0%, #10b981 50%, #059669 100%)",
            padding: "28px 28px 20px", color: "#fff",
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>{myClass.name}</div>
            {myClass.level && (
              <div style={{
                display: "inline-block", background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.25)",
                padding: "3px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: 1,
              }}>
                {myClass.level}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            <div style={{
              padding: "24px 28px", borderRight: "1px solid #f3f4f6",
              borderBottom: "1px solid #f3f4f6", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#10b981" }}>{myClass.studentCount}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Élèves</div>
            </div>
            <div style={{
              padding: "24px 28px", borderBottom: "1px solid #f3f4f6", textAlign: "center",
            }}>
              <div style={{ fontSize: 40 }}>👨‍🏫</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Titulaire</div>
            </div>
          </div>

          {/* Info */}
          <div style={{ padding: "20px 28px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f9fafb", borderRadius: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>👤</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .8 }}>Professeur Titulaire</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{myClass.main_teacher_name}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f9fafb", borderRadius: 12 }}>
              <span style={{ fontSize: 20 }}>🎓</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: .8 }}>Nombre d&apos;élèves</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111827" }}>{myClass.studentCount} élève{myClass.studentCount !== 1 ? "s" : ""}</div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: "0 28px 24px", display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/dashboard/teacher/students" style={{
              flex: 1, textAlign: "center", textDecoration: "none",
              background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff",
              padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
              boxShadow: "0 4px 14px rgba(16,185,129,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              🎓 Voir les élèves
            </Link>
            <Link href="/dashboard/teacher/attendance" style={{
              flex: 1, textAlign: "center", textDecoration: "none",
              background: "#eef2ff", color: "#4338ca",
              border: "1px solid #c7d2fe",
              padding: "12px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
              📋 Prendre la présence
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
