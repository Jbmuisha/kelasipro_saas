"use client";
import { useEffect, useState, useCallback } from "react";
import { useEffectiveUser } from "@/utils/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type StudentRow = {
  id: number;
  name: string;
  unique_id: string;
  email: string;
  profile_image: string;
  status: string;
  parents: { id: number; name: string }[];
};

export default function TeacherStudentsPage() {
  const [effectiveUser, effectiveLoading] = useEffectiveUser();
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Find the teacher's class (where they are main_teacher)
  const fetchClassInfo = useCallback(async () => {
    if (effectiveLoading || !effectiveUser?.id || !effectiveUser?.school_id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/classes/?school_id=${effectiveUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load classes");
      const data = await res.json();
      const cls = (data.classes || []).find((c: any) => c.main_teacher_id === effectiveUser.id);
      if (cls) {
        setClassId(cls.id);
        setClassName(cls.name);
      } else if (effectiveUser.class_id) {
        const found = (data.classes || []).find((c: any) => c.id === effectiveUser.class_id);
        if (found) { setClassId(found.id); setClassName(found.name); }
      }
    } catch (err: any) {
      setError(err.message);
    }
  }, [effectiveLoading, effectiveUser]);

  // Fetch students in the class
  const fetchStudents = async () => {
    if (!classId || !effectiveUser?.school_id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/?school_id=${effectiveUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load students");
      const data = await res.json();
      const list: StudentRow[] = (data.users || [])
        .filter((u: any) => u.role === "STUDENT" && String(u.class_id) === String(classId))
        .map((u: any) => ({
          id: u.id,
          name: u.name || "",
          unique_id: u.unique_id || "",
          email: u.email || "",
          profile_image: u.profile_image || "",
          status: u.status || "active",
          parents: u.parents || [],
        }))
        .sort((a: StudentRow, b: StudentRow) => a.name.localeCompare(b.name));
      setStudents(list);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchClassInfo();
  }, [fetchClassInfo]);

  useEffect(() => {
    if (classId) fetchStudents();
    else setLoading(false);
  }, [classId]);

  const filtered = search.trim()
    ? students.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.unique_id.includes(search)
      )
    : students;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h2 style={{ marginBottom: 4 }}>🎓 Mes Élèves</h2>
      {className && (
        <p style={{ color: "#666", fontSize: 14, marginBottom: 20 }}>
          Classe: <strong style={{ color: "#111827" }}>{className}</strong>
          <span style={{
            marginLeft: 12, background: "#eef2ff", color: "#4338ca",
            padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
          }}>
            {students.length} élève{students.length !== 1 ? "s" : ""}
          </span>
        </p>
      )}

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>
          {error}
        </div>
      )}

      {loading && <p style={{ color: "#6b7280" }}>Chargement des élèves...</p>}

      {!loading && !classId && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
          <p>Aucune classe ne vous est assignée. Contactez l&apos;administrateur de l&apos;école.</p>
        </div>
      )}

      {!loading && classId && students.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>📚</div>
          <p>Aucun élève dans votre classe pour le moment.</p>
        </div>
      )}

      {!loading && students.length > 0 && (
        <>
          {/* Search */}
          <div style={{ marginBottom: 16 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Rechercher un élève par nom ou ID..."
              style={{
                width: "100%", maxWidth: 400, padding: "10px 14px",
                border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14,
                boxSizing: "border-box" as const,
              }}
            />
          </div>

          {/* Student cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
            {filtered.map((s, idx) => (
              <div key={s.id} style={{
                background: "#fff",
                border: "1px solid rgba(17,24,39,0.08)",
                borderRadius: 16,
                padding: 0,
                overflow: "hidden",
                boxShadow: "0 2px 10px rgba(17,24,39,0.04)",
                transition: "box-shadow 0.2s, transform 0.2s",
              }}>
                {/* Card top accent */}
                <div style={{
                  height: 6,
                  background: `linear-gradient(135deg, ${idx % 3 === 0 ? '#6a11cb, #2575fc' : idx % 3 === 1 ? '#22c55e, #16a34a' : '#f59e0b, #ea580c'})`,
                }} />

                <div style={{ padding: "16px 18px" }}>
                  {/* Top row: photo + name */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                    {s.profile_image ? (
                      <img src={s.profile_image} alt={s.name} style={{
                        width: 48, height: 48, borderRadius: "50%", objectFit: "cover",
                        border: "3px solid #e5e7eb", flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%",
                        background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, color: "#6366f1", flexShrink: 0,
                        border: "3px solid #e5e7eb",
                      }}>
                        👤
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {s.name}
                      </div>
                      <div style={{
                        display: "inline-block", marginTop: 2,
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 700,
                        fontSize: 12, color: "#166534", background: "#f0fdf4",
                        padding: "2px 8px", borderRadius: 6, border: "1px solid #bbf7d0",
                      }}>
                        ID: {s.unique_id || "—"}
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {s.email && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
                        <span>✉️</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.email}</span>
                      </div>
                    )}
                    {s.parents && s.parents.length > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6b7280" }}>
                        <span>👨‍👩‍👧</span>
                        <span>Parent: <strong style={{ color: "#374151" }}>{s.parents.map(p => p.name).join(", ")}</strong></span>
                      </div>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <span>{s.status === "active" ? "🟢" : "🔴"}</span>
                      <span style={{ color: s.status === "active" ? "#166534" : "#991b1b", fontWeight: 600 }}>
                        {s.status === "active" ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {search && filtered.length === 0 && (
            <p style={{ color: "#9ca3af", textAlign: "center", marginTop: 20 }}>
              Aucun élève trouvé pour "{search}"
            </p>
          )}
        </>
      )}
    </div>
  );
}
