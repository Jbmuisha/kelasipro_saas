"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Child = { id: number; name: string; class_id: number; email?: string; unique_id?: string; school_id?: number };
type BulletinCourse = {
  course_id: number; course_name: string; coefficient: number; max_score: number;
  interro_avg: number | null; devoir_avg: number | null; examen_avg: number | null;
  course_avg: number | null; points_obtained: number | null; points_possible: number;
  interro_count: number; devoir_count: number; examen_count: number;
};
type GradeEntry = {
  id: number; student_id: number; student_name: string; course_id: number; course_name: string;
  period: number; grade_type: string; score: number; max_score: number; description: string; grade_date: string;
};
type RankStudent = {
  student_id: number; student_name: string; unique_id: string;
  total_obtained: number; total_possible: number; percentage: number;
  mention: string; passed: boolean; rank: number;
};

export default function ParentBulletinsPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(1);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "bulletin" | "classement">("bulletin");

  // Grades
  const [grades, setGrades] = useState<GradeEntry[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [allCourses, setAllCourses] = useState<{id: number; name: string}[]>([]);

  // Bulletin
  const [bulletinData, setBulletinData] = useState<any>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);

  // Classement
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Child details cache
  const [childDetails, setChildDetails] = useState<Record<number, Child>>({});

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      if (u.children && u.children.length > 0) {
        setChildren(u.children);
        setSelectedChildId(u.children[0].id);
      }
    }
    setLoading(false);
  }, []);

  // Fetch children details (class_id, school_id)
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchChildren = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_URL}/api/users/${currentUser.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const user = data.user || data;
          if (user.children && user.children.length > 0) {
            setChildren(user.children);
            if (!selectedChildId) setSelectedChildId(user.children[0].id);
            // Fetch each child's details
            for (const child of user.children) {
              try {
                const cRes = await fetch(`${API_URL}/api/users/${child.id}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (cRes.ok) {
                  const cd = await cRes.json();
                  const cu = cd.user || cd;
                  setChildDetails(prev => ({ ...prev, [child.id]: { ...child, class_id: cu.class_id, school_id: cu.school_id } }));
                }
              } catch {}
            }
          }
        }
      } catch {}
    };
    fetchChildren();
  }, [currentUser]);

  const getChildInfo = (childId: number) => {
    const detail = childDetails[childId];
    if (detail) return detail;
    const basic = children.find(c => c.id === childId);
    return basic || null;
  };

  // Fetch grades
  const fetchGrades = async () => {
    const child = getChildInfo(selectedChildId!);
    if (!child?.class_id) return;
    setLoadingGrades(true);
    setGrades([]);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const period = selectedPeriod || 1;
      let url = `/api/grades?class_id=${child.class_id}&student_id=${selectedChildId}&period=${period}`;
      if (selectedCourseId) url += `&course_id=${selectedCourseId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setGrades(data.grades || []);
      } else {
        setError("Erreur lors du chargement des notes");
      }
      
      // Fetch courses for this class for filter dropdown
      const coursesRes = await fetch(`/api/courses?class_id=${child.class_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setAllCourses(coursesData.courses || []);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoadingGrades(false); }
  };

  // Fetch bulletin and ranking
  const fetchBulletin = async () => {
    const child = getChildInfo(selectedChildId!);
    if (!child?.class_id) return;
    setLoadingBulletin(true);
    setBulletinData(null);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const schoolId = child.school_id || currentUser?.school_id;
      const period = selectedPeriod || 1;
      
      // Fetch bulletin
      let url = `/api/grades/bulletin?student_id=${selectedChildId}&class_id=${child.class_id}&school_id=${schoolId}`;
      if (selectedPeriod) url += `&period=${selectedPeriod}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBulletinData(data.bulletin);
      } else {
        const b = await res.json().catch(() => ({}));
        setError(b.error || "Erreur lors du chargement");
      }
      
      // Also fetch class summary for ranking
      const summaryRes = await fetch(
        `/api/grades/class-summary?class_id=${child.class_id}&period=${period}&school_id=${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setSummaryData(summary);
      }
    } catch (err: any) { setError(err.message); }
    finally { setLoadingBulletin(false); }
  };

  // Fetch classement
  const fetchClassement = async () => {
    const child = getChildInfo(selectedChildId!);
    if (!child?.class_id) return;
    setLoadingSummary(true);
    setSummaryData(null);
    try {
      const token = localStorage.getItem("token");
      const schoolId = child.school_id || currentUser?.school_id;
      const res = await fetch(
        `/api/grades/class-summary?class_id=${child.class_id}&period=${selectedPeriod || 1}&school_id=${schoolId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) { setSummaryData(await res.json()); }
    } catch (err: any) { setError(err.message); }
    finally { setLoadingSummary(false); }
  };

  // Auto-fetch on tab/child/period change
  useEffect(() => {
    if (!selectedChildId || !getChildInfo(selectedChildId)?.class_id) return;
    if (activeTab === "notes") fetchGrades();
    else if (activeTab === "bulletin") fetchBulletin();
    else if (activeTab === "classement") fetchClassement();
  }, [selectedChildId, selectedPeriod, selectedCourseId, activeTab, childDetails]);

  const getMentionColor = (m: string) => {
    if (m === "Très Grande Distinction") return "#7c3aed";
    if (m === "Grande Distinction") return "#2563eb";
    if (m === "Distinction") return "#059669";
    if (m === "Suffisant") return "#d97706";
    return "#dc2626";
  };
  const getMentionBg = (m: string) => {
    if (m === "Très Grande Distinction") return "#f5f3ff";
    if (m === "Grande Distinction") return "#eff6ff";
    if (m === "Distinction") return "#f0fdf4";
    if (m === "Suffisant") return "#fffbeb";
    return "#fef2f2";
  };

  const card: React.CSSProperties = { background: "#fff", border: "1px solid rgba(17,24,39,0.08)", borderRadius: 16, padding: 20, boxShadow: "0 4px 16px rgba(17,24,39,0.04)", marginBottom: 16 };
  const sel: React.CSSProperties = { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 10, fontSize: 14, background: "#fff" };
  const tab = (a: boolean): React.CSSProperties => ({
    padding: "10px 20px", border: "none", borderBottom: a ? "3px solid #d97706" : "3px solid transparent",
    background: a ? "#fffbeb" : "transparent", color: a ? "#92400e" : "#6b7280",
    fontWeight: a ? 700 : 500, fontSize: 14, cursor: "pointer", borderRadius: "8px 8px 0 0",
  });

  if (loading) return <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}><p>Chargement...</p></div>;
  if (children.length === 0) return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, textAlign: "center" }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>👨‍👩‍👧</div>
      <p style={{ color: "#9ca3af" }}>Aucun enfant lié à votre compte.</p>
    </div>
  );

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
      <div style={{
        background: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)",
        borderRadius: 20, padding: "24px 28px", color: "#fff", marginBottom: 20,
        boxShadow: "0 12px 40px rgba(217,119,6,0.2)",
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>📊 Résultats scolaires</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>Notes, bulletins et classement de vos enfants</p>
      </div>

      {error && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>❌ {error}</div>}

      {/* Selectors */}
      <div style={card}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Enfant</label>
            <select style={sel} value={selectedChildId ?? ""} onChange={e => setSelectedChildId(e.target.value ? Number(e.target.value) : null)}>
              {children.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
            <select style={sel} value={selectedPeriod ?? ""} onChange={e => setSelectedPeriod(e.target.value ? Number(e.target.value) : null)}>
              <optgroup label="Trimestre 1">
                <option value={1}>📄 Bulletin P1</option>
                <option value={2}>📄 Bulletin P2</option>
                <option value={3}>📝 Examen T1</option>
                <option value={10}>📊 Total T1</option>
              </optgroup>
              <optgroup label="Trimestre 2">
                <option value={4}>📄 Bulletin P4</option>
                <option value={5}>📄 Bulletin P5</option>
                <option value={6}>📝 Examen T2</option>
                <option value={11}>📊 Total T2</option>
              </optgroup>
              <optgroup label="Trimestre 3">
                <option value={7}>📄 Bulletin P7</option>
                <option value={8}>📄 Bulletin P8</option>
                <option value={9}>📝 Examen T3</option>
                <option value={12}>📊 Total T3</option>
              </optgroup>
              <optgroup label="Annuel">
                <option value={0}>📋 Bulletin Annuel</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        <button style={tab(activeTab === "notes")} onClick={() => setActiveTab("notes")}>📝 Notes détaillées</button>
        <button style={tab(activeTab === "bulletin")} onClick={() => setActiveTab("bulletin")}>📊 Bulletin</button>
        <button style={tab(activeTab === "classement")} onClick={() => setActiveTab("classement")}>🏆 Classement</button>
      </div>

      {/* ===== NOTES TAB ===== */}
      {activeTab === "notes" && (
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 16, color: "#111827" }}>📝 Mes Notes — {children.find(c => c.id === selectedChildId)?.name}</h3>
          
          {/* Period and Course filters */}
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
              <select 
                style={{ ...sel, width: 160 }} 
                value={selectedPeriod ?? ""} 
                onChange={e => setSelectedPeriod(e.target.value ? Number(e.target.value) : null)}
              >
                <optgroup label="Trimestre 1">
                  <option value={1}>P1</option>
                  <option value={2}>P2</option>
                  <option value={3}>Examen T1</option>
                </optgroup>
                <optgroup label="Trimestre 2">
                  <option value={4}>P4</option>
                  <option value={5}>P5</option>
                  <option value={6}>Examen T2</option>
                </optgroup>
                <optgroup label="Trimestre 3">
                  <option value={7}>P7</option>
                  <option value={8}>P8</option>
                  <option value={9}>Examen T3</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Cours</label>
              <select 
                style={{ ...sel, width: 180 }} 
                value={selectedCourseId ?? ""} 
                onChange={e => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">Tous les cours</option>
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
          {loadingGrades && <p style={{ color: "#6b7280" }}>Chargement...</p>}
          {!loadingGrades && grades.length === 0 && !error && (
            <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
              <p>Aucune note pour cette période.</p>
            </div>
          )}
          {!loadingGrades && grades.length > 0 && (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Cours</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Type</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Note</th>
                    <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Description</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map(g => (
                    <tr key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 10px", fontWeight: 600 }}>{g.course_name}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center" }}>
                        <span style={{
                          padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: g.grade_type === "interro" ? "#dbeafe" : g.grade_type === "devoir" ? "#fef3c7" : "#ede9fe",
                          color: g.grade_type === "interro" ? "#1e40af" : g.grade_type === "devoir" ? "#92400e" : "#5b21b6",
                        }}>
                          {g.grade_type === "interro" ? "Interro" : g.grade_type === "devoir" ? "Devoir" : "Examen"}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, fontSize: 15 }}>
                        <span style={{ color: (g.score / g.max_score) >= 0.5 ? "#166534" : "#dc2626" }}>
                          {g.score}/{g.max_score}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", color: "#6b7280", fontSize: 12 }}>{g.description || "—"}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>{g.grade_date || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>Total: {grades.length} note(s)</p>
            </div>
          )}
        </div>
      )}

      {/* ===== BULLETIN TAB ===== */}
      {activeTab === "bulletin" && (
        <div>
          {loadingBulletin && <p style={{ color: "#6b7280", textAlign: "center" }}>Chargement du bulletin...</p>}

          {bulletinData && bulletinData.type === "period" && (
            <div style={card}>
              <div style={{ background: "linear-gradient(135deg, #1e3a5f, #2563eb)", borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20, textAlign: "center" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>BULLETIN SCOLAIRE</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>{bulletinData.student?.name} — {bulletinData.class?.name}</p>
              </div>
              {/* Summary stats */}
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
                <div style={{ background: "#f0fdf4", border: "2px solid #bbf7d0", borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#166534" }}>{bulletinData.percentage}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Pourcentage</div>
                </div>
                <div style={{ background: getMentionBg(bulletinData.mention), border: `2px solid ${getMentionColor(bulletinData.mention)}20`, borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: getMentionColor(bulletinData.mention) }}>{bulletinData.mention}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Mention</div>
                </div>
                <div style={{ background: "#eff6ff", border: "2px solid #bfdbfe", borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "#1e40af" }}>
                    {summaryData?.students?.find((s: any) => s.student_id === selectedChildId)?.rank || "—"}
                    <span style={{ fontSize: 12, fontWeight: 400 }}>/{summaryData?.total_students || "—"}</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Rang Classe</div>
                </div>
                <div style={{ 
                  background: bulletinData.decision === "Réussi" ? "#f0fdf4" : bulletinData.decision === "Repêotage" ? "#fffbeb" : "#fef2f2", 
                  border: `2px solid ${bulletinData.decision === "Réussi" ? "#bbf7d0" : bulletinData.decision === "Repêotage" ? "#fde68a" : "#fecaca"}`, 
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140 
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: bulletinData.decision === "Réussi" ? "#166534" : bulletinData.decision === "Repêotage" ? "#92400e" : "#991b1b" }}>
                    {bulletinData.decision === "Réussi" ? "✅ RÉUSSI" : bulletinData.decision === "Repêotage" ? "⚠️ REPÊCHAGE" : "❌ DOUBLE"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Seuil: {bulletinData.pass_percentage}%</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0f9ff" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Cours</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Coeff.</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Max</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Interro</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Devoir</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Moyenne</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bulletinData.courses || []).map((c: BulletinCourse) => (
                      <tr key={c.course_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.course_name}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280" }}>×{c.coefficient}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280" }}>/{c.max_score}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.interro_avg !== null ? <strong>{c.interro_avg}</strong> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>{c.devoir_avg !== null ? <strong>{c.devoir_avg}</strong> : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>{c.course_avg !== null ? c.course_avg : <span style={{ color: "#d1d5db" }}>—</span>}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                          {c.points_obtained !== null ? <>{c.points_obtained}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{c.points_possible}</span></> : <span style={{ color: "#d1d5db" }}>—/{c.points_possible}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
                      <td colSpan={6} style={{ padding: "12px", textAlign: "right", fontSize: 15 }}>TOTAL</td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: 16 }}>{bulletinData.total_obtained}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{bulletinData.total_possible}</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {bulletinData && bulletinData.type === "annual" && (
            <div style={card}>
              <div style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20, textAlign: "center" }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>BULLETIN ANNUEL</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>{bulletinData.student?.name} — {bulletinData.class?.name}</p>
              </div>
              {(bulletinData.periods || []).map((p: any) => (
                <div key={p.period} style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Période {p.period}</strong>
                    <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: getMentionBg(p.mention), color: getMentionColor(p.mention) }}>{p.percentage}% ��� {p.mention}</span>
                  </div>
                  <div style={{ padding: "8px 16px", fontSize: 13 }}><span style={{ fontWeight: 600 }}>Total: {p.total_obtained}/{p.total_possible}</span></div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", justifyContent: "center" }}>
                <div style={{ background: "#f5f3ff", border: "2px solid #c4b5fd", borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 160 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed" }}>{bulletinData.annual_percentage}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Moyenne Annuelle</div>
                </div>
                <div style={{ background: getMentionBg(bulletinData.annual_mention), border: `2px solid ${getMentionColor(bulletinData.annual_mention)}20`, borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 160 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: getMentionColor(bulletinData.annual_mention) }}>{bulletinData.annual_mention}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Mention</div>
                </div>
                <div style={{ 
                  background: bulletinData.decision === "Réussi" ? "#f0fdf4" : bulletinData.decision === "Repêotage" ? "#fffbeb" : "#fef2f2", 
                  border: `2px solid ${bulletinData.decision === "Réussi" ? "#bbf7d0" : bulletinData.decision === "Repêotage" ? "#fde68a" : "#fecaca"}`, 
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 160 
                }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: bulletinData.decision === "Réussi" ? "#166534" : bulletinData.decision === "Repêotage" ? "#92400e" : "#991b1b" }}>
                    {bulletinData.decision === "Réussi" ? "✅ RÉUSSI" : bulletinData.decision === "Repêotage" ? "⚠️ REPÊCHAGE" : "❌ DOUBLE"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Seuil: {bulletinData.pass_percentage}%</div>
                </div>
              </div>
            </div>
          )}

          {!loadingBulletin && !bulletinData && !error && (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}><div style={{ fontSize: 48, marginBottom: 8 }}>📊</div><p>Aucune note disponible pour le moment.</p></div>
          )}
        </div>
      )}

      {/* ===== CLASSEMENT TAB ===== */}
      {activeTab === "classement" && (
        <div>
          {loadingSummary && <p style={{ color: "#6b7280", textAlign: "center" }}>Chargement du classement...</p>}
          {summaryData && (
            <div style={card}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>🏆 Classement — Période {selectedPeriod || 1}</h3>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#166534" }}>{summaryData.passed_count}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Réussi</div>
                </div>
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#991b1b" }}>{summaryData.failed_count}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Échec</div>
                </div>
                <div style={{ background: "#f0f9ff", border: "1px solid #bfdbfe", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#1e40af" }}>{summaryData.total_students}</div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Total</div>
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 60 }}>Rang</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Nom</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Points</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>%</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Mention</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaryData.students || []).map((s: RankStudent) => {
                      const isMyChild = s.student_id === selectedChildId;
                      return (
                        <tr key={s.student_id} style={{
                          borderBottom: "1px solid #f3f4f6",
                          background: isMyChild ? "#fffbeb" : s.rank <= 3 ? "#fefce8" : "transparent",
                          fontWeight: isMyChild ? 700 : 400,
                          border: isMyChild ? "2px solid #f59e0b" : undefined,
                        }}>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, fontSize: 16 }}>
                            {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : s.rank}
                          </td>
                          <td style={{ padding: "8px 12px", fontWeight: isMyChild ? 800 : 600 }}>
                            {s.student_name} {isMyChild && <span style={{ fontSize: 11, color: "#d97706", marginLeft: 6 }}>⭐ Mon enfant</span>}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>{s.total_obtained}<span style={{ color: "#9ca3af" }}>/{s.total_possible}</span></td>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 15 }}>{s.percentage}%</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: getMentionBg(s.mention), color: getMentionColor(s.mention) }}>{s.mention}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!loadingSummary && !summaryData && (
            <div style={{ textAlign: "center", padding: 40, color: "#9ca3af" }}><div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div><p>Aucun classement disponible.</p></div>
          )}
        </div>
      )}
    </div>
  );
}
