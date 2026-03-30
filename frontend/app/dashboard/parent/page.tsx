"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Child = { id: number; name: string; email?: string; class_id?: number };
type AttendanceRecord = { date: string; status: string; class_name?: string };

const STATUS_CONFIG: Record<string, { label: string; emoji: string; bg: string; border: string; color: string }> = {
  present: { label: "Présent", emoji: "✅", bg: "#dcfce7", border: "#bbf7d0", color: "#166534" },
  absent:  { label: "Absent",  emoji: "❌", bg: "#fee2e2", border: "#fecaca", color: "#991b1b" },
  late:    { label: "En retard", emoji: "⏰", bg: "#fef3c7", border: "#fde68a", color: "#92400e" },
  excused: { label: "Excusé",  emoji: "📝", bg: "#e0e7ff", border: "#c7d2fe", color: "#3730a3" },
};

export default function ParentDashboard() {
  const [user, setUser] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [attendanceByChild, setAttendanceByChild] = useState<Record<number, { today: string | null; records: AttendanceRecord[] }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setUser(u);
    }
  }, []);

  // Fetch parent's children from the user object
  const fetchChildren = async () => {
    if (!user?.id) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/users/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children || []);
      }
    } catch (err) { console.error(err); }
  };

  // Fetch attendance for each child
  const fetchAttendance = async () => {
    if (children.length === 0) { setLoading(false); return; }
    setLoading(true);
    const token = localStorage.getItem("token");
    const results: Record<number, { today: string | null; records: AttendanceRecord[] }> = {};

    for (const child of children) {
      try {
        const res = await fetch(`${API_URL}/api/attendance/student/${child.id}?limit=14`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          results[child.id] = {
            today: data.today_status || null,
            records: data.records || [],
          };
        }
      } catch (err) { console.error(err); }
    }
    setAttendanceByChild(results);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.id) fetchChildren();
  }, [user]);

  useEffect(() => {
    if (children.length > 0) fetchAttendance();
    else if (user) setLoading(false);
  }, [children]);

  const todayStr = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 4, fontSize: 24 }}>👋 Bienvenue, {user?.name || "Parent"}</h1>
      <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24, textTransform: "capitalize" }}>
        📅 {todayStr}
      </p>

      {loading && <p style={{ color: "#6b7280" }}>Chargement...</p>}

      {!loading && children.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>👨‍👩‍👧</div>
          <p>Aucun enfant lié à votre compte.</p>
        </div>
      )}

      {/* Child cards */}
      {!loading && children.map(child => {
        const att = attendanceByChild[child.id];
        const todayStatus = att?.today || null;
        const records = att?.records || [];
        const cfg = todayStatus ? STATUS_CONFIG[todayStatus] : null;

        return (
          <div key={child.id} style={{
            marginBottom: 24, borderRadius: 20, overflow: "hidden",
            border: "1px solid rgba(17,24,39,0.08)",
            boxShadow: "0 8px 30px rgba(17,24,39,0.06)",
            background: "#fff",
          }}>
            {/* Child header */}
            <div style={{
              background: "linear-gradient(135deg, #1e3a5f 0%, #2575fc 50%, #6a11cb 100%)",
              padding: "20px 24px", color: "#fff",
              display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
            }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>{child.name}</div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>Élève</div>
              </div>
              <div style={{
                background: "rgba(255,255,255,0.15)", backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.25)",
                padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
              }}>
                ID: {child.id}
              </div>
            </div>

            {/* Today's status - BIG prominent display */}
            <div style={{ padding: "20px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                Présence aujourd&apos;hui
              </div>

              {todayStatus && cfg ? (
                <div style={{
                  background: cfg.bg, border: `2px solid ${cfg.border}`, borderRadius: 16,
                  padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
                }}>
                  <div style={{ fontSize: 48 }}>{cfg.emoji}</div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: cfg.color }}>{cfg.label}</div>
                    <div style={{ fontSize: 13, color: cfg.color, opacity: 0.8, marginTop: 2 }}>
                      {todayStatus === "present" && "Votre enfant est bien présent en classe aujourd'hui."}
                      {todayStatus === "absent" && "Votre enfant est marqué absent aujourd'hui."}
                      {todayStatus === "late" && "Votre enfant est arrivé en retard aujourd'hui."}
                      {todayStatus === "excused" && "L'absence de votre enfant est excusée."}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  background: "#f9fafb", border: "2px dashed #d1d5db", borderRadius: 16,
                  padding: "20px 24px", display: "flex", alignItems: "center", gap: 16,
                }}>
                  <div style={{ fontSize: 48 }}>⏳</div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "#6b7280" }}>Pas encore marqué</div>
                    <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
                      La présence n&apos;a pas encore été prise aujourd&apos;hui.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent attendance history */}
            {records.length > 0 && (
              <div style={{ padding: "0 24px 20px" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>
                  Historique récent
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {records.slice(0, 14).map((r, i) => {
                    const c = STATUS_CONFIG[r.status] || STATUS_CONFIG.present;
                    const d = new Date(r.date);
                    const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short" });
                    const dateLabel = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
                    return (
                      <div key={i} title={`${dateLabel}: ${c.label}`} style={{
                        display: "flex", flexDirection: "column", alignItems: "center",
                        background: c.bg, border: `1px solid ${c.border}`, borderRadius: 10,
                        padding: "6px 10px", minWidth: 52,
                      }}>
                        <div style={{ fontSize: 18 }}>{c.emoji}</div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: c.color, marginTop: 2 }}>{dayLabel}</div>
                        <div style={{ fontSize: 9, color: c.color, opacity: 0.7 }}>{d.getDate()}/{d.getMonth() + 1}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
