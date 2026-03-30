"use client";
import React, { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ClassItem = {
  id: number;
  name: string;
  main_teacher_id?: number;
  main_teacher_name?: string;
};

type CourseItem = {
  id: number;
  name: string;
  classes: { class_id: number; name: string }[];
};

type GradeConfig = {
  pass_percentage: number;
  interro_weight: number;
  devoir_weight: number;
  examen_weight: number;
  max_periods: number;
};

type ClassSummaryStudent = {
  student_id: number;
  student_name: string;
  unique_id: string;
  total_obtained: number;
  total_possible: number;
  percentage: number;
  mention: string;
  passed: boolean;
  rank: number;
};

export default function SchoolGradesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Config
  const [config, setConfig] = useState<GradeConfig>({
    pass_percentage: 50,
    interro_weight: 50,
    devoir_weight: 50,
    examen_weight: 0,
    max_periods: 3,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Classes & courses
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [allCourses, setAllCourses] = useState<CourseItem[]>([]);

  // Course configs per class
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [courseConfigs, setCourseConfigs] = useState<Record<number, { coefficient: number; max_score: number }>>({});
  const [savingCourseConfig, setSavingCourseConfig] = useState(false);

  // Class summary
  const [summaryClassId, setSummaryClassId] = useState<number | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState(1);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<"config" | "courses" | "results">("config");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    if (!currentUser?.school_id) { setLoading(false); return; }
    fetchData();
  }, [currentUser]);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(null), 4000); return () => clearTimeout(t); }
  }, [success]);
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(null), 6000); return () => clearTimeout(t); }
  }, [error]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const schoolId = currentUser?.school_id;

      // Fetch grade config
      const cfgRes = await fetch(`/api/grades/config?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (cfgRes.ok) {
        const cfgData = await cfgRes.json();
        if (cfgData.config) setConfig(cfgData.config);
      }

      // Fetch classes
      const level = (currentUser?.admin_level || localStorage.getItem("school_type") || "primaire").toLowerCase();
      const classRes = await fetch(`/api/classes?school_id=${schoolId}&level=${level}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (classRes.ok) {
        const classData = await classRes.json();
        setClasses(classData.classes || []);
      }

      // Fetch courses
      const coursesRes = await fetch(`/api/schools/${schoolId}/teacher-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setAllCourses(coursesData.courses || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Save grade config
  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/grades/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: currentUser?.school_id,
          ...config,
        }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setSuccess("Configuration sauvegardée!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // Load course configs for selected class
  useEffect(() => {
    if (!selectedClassId) return;
    const loadCourseConfigs = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/grades/course-config?class_id=${selectedClassId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          const cfgMap: Record<number, { coefficient: number; max_score: number }> = {};
          for (const cfg of data.configs || []) {
            cfgMap[cfg.course_id] = { coefficient: cfg.coefficient, max_score: cfg.max_score };
          }
          setCourseConfigs(cfgMap);
        }
      } catch {}
    };
    loadCourseConfigs();
  }, [selectedClassId]);

  // Get courses for selected class
  const getCoursesForClass = (classId: number) => {
    return allCourses.filter((c) =>
      (c.classes || []).some((cc) => cc.class_id === classId)
    );
  };

  // Save course configs
  const handleSaveCourseConfigs = async () => {
    if (!selectedClassId) return;
    setSavingCourseConfig(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const classCourses = getCoursesForClass(selectedClassId);
      const configs = classCourses.map((c) => ({
        course_id: c.id,
        class_id: selectedClassId,
        coefficient: courseConfigs[c.id]?.coefficient || 1,
        max_score: courseConfigs[c.id]?.max_score || 10,
      }));
      const res = await fetch("/api/grades/course-config/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ configs }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setSuccess("Coefficients sauvegardés!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingCourseConfig(false);
    }
  };

  // Fetch class summary
  const fetchClassSummary = async () => {
    if (!summaryClassId) return;
    setLoadingSummary(true);
    setSummaryData(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/grades/class-summary?class_id=${summaryClassId}&period=${summaryPeriod}&school_id=${currentUser?.school_id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const getMentionColor = (mention: string) => {
    switch (mention) {
      case "Très Grande Distinction": return "#7c3aed";
      case "Grande Distinction": return "#2563eb";
      case "Distinction": return "#059669";
      case "Suffisant": return "#d97706";
      default: return "#dc2626";
    }
  };

  const getMentionBg = (mention: string) => {
    switch (mention) {
      case "Très Grande Distinction": return "#f5f3ff";
      case "Grande Distinction": return "#eff6ff";
      case "Distinction": return "#f0fdf4";
      case "Suffisant": return "#fffbeb";
      default: return "#fef2f2";
    }
  };

  const cardStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid rgba(17,24,39,0.08)",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 4px 16px rgba(17,24,39,0.04)",
    marginBottom: 16,
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: "10px 20px",
    border: "none",
    borderBottom: active ? "3px solid #2563eb" : "3px solid transparent",
    background: active ? "#eff6ff" : "transparent",
    color: active ? "#1e40af" : "#6b7280",
    fontWeight: active ? 700 : 500,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
    borderRadius: "8px 8px 0 0",
  });

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 14px",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    fontSize: 14,
    boxSizing: "border-box" as const,
  };

  const btnPrimary: React.CSSProperties = {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  };

  if (loading) {
    return <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}><p>Chargement...</p></div>;
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1d4ed8 100%)",
        borderRadius: 20, padding: "24px 28px", color: "#fff", marginBottom: 20,
        boxShadow: "0 12px 40px rgba(37,99,235,0.2)",
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>📊 Gestion des Notes (Primaire)</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>
          Configurez le système de notation, les coefficients et consultez les résultats
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>
          ❌ {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", borderRadius: 12, padding: "10px 16px", marginBottom: 14, fontSize: 14 }}>
          ✅ {success}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: "1px solid #e5e7eb" }}>
        <button style={tabStyle(activeTab === "config")} onClick={() => setActiveTab("config")}>⚙️ Configuration</button>
        <button style={tabStyle(activeTab === "courses")} onClick={() => setActiveTab("courses")}>📚 Coefficients</button>
        <button style={tabStyle(activeTab === "results")} onClick={() => setActiveTab("results")}>🏆 Résultats</button>
      </div>

      {/* ===================== TAB: CONFIG ===================== */}
      {activeTab === "config" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>⚙️ Configuration du système de notation</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Ces paramètres s&apos;appliquent à toute l&apos;école pour le calcul des moyennes et bulletins.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Pourcentage de réussite (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.pass_percentage}
                  onChange={(e) => setConfig({ ...config, pass_percentage: Number(e.target.value) })}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Seuil minimum pour réussir (ex: 50%)</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Poids des Interrogations (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.interro_weight}
                  onChange={(e) => setConfig({ ...config, interro_weight: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Poids des Devoirs (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.devoir_weight}
                  onChange={(e) => setConfig({ ...config, devoir_weight: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Poids des Examens (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={config.examen_weight}
                  onChange={(e) => setConfig({ ...config, examen_weight: Number(e.target.value) })}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>0% si pas d&apos;examen au primaire</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Nombre de périodes
                </label>
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={config.max_periods}
                  onChange={(e) => setConfig({ ...config, max_periods: Number(e.target.value) })}
                  style={inputStyle}
                />
              </div>
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button style={{ ...btnPrimary, opacity: savingConfig ? 0.6 : 1 }} disabled={savingConfig} onClick={handleSaveConfig}>
                {savingConfig ? "Sauvegarde..." : "💾 Sauvegarder Configuration"}
              </button>
            </div>
          </div>

          {/* Info box */}
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14,
            padding: "16px 20px", fontSize: 13, color: "#1e40af",
          }}>
            <strong>ℹ️ Système de notation RDC (Primaire):</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li>3 périodes (trimestres) par année scolaire</li>
              <li>Chaque période: interrogations + devoirs (+ examens optionnel)</li>
              <li>Moyenne période = (Moy. Interros × poids) + (Moy. Devoirs × poids)</li>
              <li>Moyenne annuelle = (P1 + P2 + P3) ÷ 3</li>
              <li>Points = Moyenne cours × Coefficient</li>
              <li>Pourcentage = (Total obtenu ÷ Total possible) × 100</li>
            </ul>
            <div style={{ marginTop: 10 }}>
              <strong>Mentions:</strong> 50% Suffisant | 60% Distinction | 70% Grande Distinction | 80%+ Très Grande Distinction
            </div>
          </div>
        </div>
      )}

      {/* ===================== TAB: COURSE CONFIGS ===================== */}
      {activeTab === "courses" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📚 Coefficients par classe</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Sélectionnez une classe pour configurer les coefficients et cotes maximales de chaque cours.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Classe</label>
              <select
                style={{ ...inputStyle, maxWidth: 300, background: "#fff" }}
                value={selectedClassId ?? ""}
                onChange={(e) => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">-- Choisir une classe --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.main_teacher_name ? `(${c.main_teacher_name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedClassId && (() => {
              const classCourses = getCoursesForClass(selectedClassId);
              if (classCourses.length === 0) {
                return <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun cours assigné à cette classe. Créez des cours d&apos;abord.</p>;
              }
              return (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Cours</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 120 }}>Coefficient</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 120 }}>Cote Max</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 120 }}>Points Max</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classCourses.map((c) => {
                          const coeff = courseConfigs[c.id]?.coefficient || 1;
                          const maxSc = courseConfigs[c.id]?.max_score || 10;
                          return (
                            <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                              <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.name}</td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <input
                                  type="number"
                                  min={1}
                                  max={10}
                                  value={coeff}
                                  onChange={(e) => setCourseConfigs((prev) => ({
                                    ...prev,
                                    [c.id]: { ...prev[c.id], coefficient: Number(e.target.value), max_score: prev[c.id]?.max_score || 10 },
                                  }))}
                                  style={{
                                    width: 70, padding: "6px 8px", border: "2px solid #d1d5db",
                                    borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center" }}>
                                <input
                                  type="number"
                                  min={1}
                                  max={100}
                                  value={maxSc}
                                  onChange={(e) => setCourseConfigs((prev) => ({
                                    ...prev,
                                    [c.id]: { ...prev[c.id], max_score: Number(e.target.value), coefficient: prev[c.id]?.coefficient || 1 },
                                  }))}
                                  style={{
                                    width: 70, padding: "6px 8px", border: "2px solid #d1d5db",
                                    borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center",
                                  }}
                                />
                              </td>
                              <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#2563eb" }}>
                                {maxSc * coeff}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
                          <td colSpan={3} style={{ padding: "10px 12px", textAlign: "right" }}>Total Points Possibles:</td>
                          <td style={{ padding: "10px 12px", textAlign: "center", fontSize: 16, color: "#1e40af" }}>
                            {classCourses.reduce((sum, c) => {
                              const coeff = courseConfigs[c.id]?.coefficient || 1;
                              const maxSc = courseConfigs[c.id]?.max_score || 10;
                              return sum + maxSc * coeff;
                            }, 0)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                    <button style={{ ...btnPrimary, opacity: savingCourseConfig ? 0.6 : 1 }} disabled={savingCourseConfig} onClick={handleSaveCourseConfigs}>
                      {savingCourseConfig ? "Sauvegarde..." : "💾 Sauvegarder Coefficients"}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ===================== TAB: RESULTS ===================== */}
      {activeTab === "results" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>🏆 Résultats par classe</h3>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Classe</label>
                <select
                  style={{ ...inputStyle, width: 250, background: "#fff" }}
                  value={summaryClassId ?? ""}
                  onChange={(e) => setSummaryClassId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Choisir une classe --</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
                <select
                  style={{ ...inputStyle, width: 180, background: "#fff" }}
                  value={summaryPeriod}
                  onChange={(e) => setSummaryPeriod(Number(e.target.value))}
                >
                  <option value={1}>1ère Période (T1)</option>
                  <option value={2}>2ème Période (T2)</option>
                  <option value={3}>3ème Période (T3)</option>
                </select>
              </div>
              <button style={btnPrimary} onClick={fetchClassSummary} disabled={!summaryClassId || loadingSummary}>
                {loadingSummary ? "Chargement..." : "📊 Voir Résultats"}
              </button>
            </div>
          </div>

          {loadingSummary && <p style={{ color: "#6b7280" }}>Chargement...</p>}

          {summaryData && (
            <div style={cardStyle}>
              {/* Stats */}
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
                {summaryData.total_students > 0 && (
                  <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#92400e" }}>
                      {Math.round((summaryData.passed_count / summaryData.total_students) * 100)}%
                    </div>
                    <div style={{ fontSize: 11, color: "#6b7280" }}>Taux de réussite</div>
                  </div>
                )}
              </div>

              {/* Ranking table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 60 }}>Rang</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Nom</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>ID</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Points</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>%</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Mention</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(summaryData.students || []).map((s: ClassSummaryStudent) => (
                      <tr key={s.student_id} style={{
                        borderBottom: "1px solid #f3f4f6",
                        background: s.rank <= 3 ? "#fffbeb" : "transparent",
                      }}>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 800, fontSize: 16 }}>
                          {s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : s.rank}
                        </td>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{s.student_name}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{s.unique_id}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 600 }}>
                          {s.total_obtained}<span style={{ color: "#9ca3af" }}>/{s.total_possible}</span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 15 }}>
                          {s.percentage}%
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          <span style={{
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                            background: getMentionBg(s.mention), color: getMentionColor(s.mention),
                          }}>
                            {s.mention}
                          </span>
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {s.passed ? (
                            <span style={{ color: "#166534", fontWeight: 700 }}>✅</span>
                          ) : (
                            <span style={{ color: "#991b1b", fontWeight: 700 }}>❌</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
