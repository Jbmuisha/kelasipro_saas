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
  repech_percentage: number;
  double_percentage: number;
  interro_weight: number;
  devoir_weight: number;
  examen_weight: number;
  max_periods: number;
};

type SchoolThresholds = {
  pass_percentage: number;
  double_percentage: number;
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

  // Config - School Admin Thresholds
  const [schoolThresholds, setSchoolThresholds] = useState<SchoolThresholds>({
    pass_percentage: 50,
    double_percentage: 55,
  });
  const [savingThresholds, setSavingThresholds] = useState(false);

  // Config - General settings
  const [config, setConfig] = useState<GradeConfig>({
    pass_percentage: 50,
    repech_percentage: 45,
    double_percentage: 55,
    interro_weight: 50,
    devoir_weight: 50,
    examen_weight: 0,
    max_periods: 9,
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
  
  // All periods data for overview
  const [allPeriodsData, setAllPeriodsData] = useState<Record<number, any>>({});
  const [loadingAllPeriods, setLoadingAllPeriods] = useState(false);
  
  // Submit bulletins
  const [submittingBulletin, setSubmittingBulletin] = useState(false);

  // Tab
  const [activeTab, setActiveTab] = useState<"thresholds" | "courses" | "results">("thresholds");

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


  // Save school thresholds
  const handleSaveThresholds = async () => {
    setSavingThresholds(true);
    setError(null);
    try {
      // Save to localStorage for now
      localStorage.setItem("school_thresholds_" + currentUser?.school_id, JSON.stringify(schoolThresholds));
      setSuccess("Seuils sauvegardés!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingThresholds(false);
    }
  };

  // Load school thresholds from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("school_thresholds_" + currentUser?.school_id);
    if (saved) {
      try {
        setSchoolThresholds(JSON.parse(saved));
      } catch {}
    }
  }, [currentUser]);

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

  // Fetch all periods summaries for overview
  const fetchAllPeriods = async () => {
    if (!summaryClassId) return;
    setLoadingAllPeriods(true);
    setAllPeriodsData({});
    try {
      const token = localStorage.getItem("token");
      const periods = [1, 2, 3, 10, 4, 5, 6, 11, 7, 8, 9, 12, 0]; // P1-P9, Trimestres T1-T3, Annuel
      const results: Record<number, any> = {};
      
      for (const period of periods) {
        try {
          const res = await fetch(
            `/api/grades/class-summary?class_id=${summaryClassId}&period=${period}&school_id=${currentUser?.school_id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.ok) {
            const data = await res.json();
            results[period] = data;
          }
        } catch (err) {
          console.error(`Error fetching period ${period}:`, err);
        }
      }
      setAllPeriodsData(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingAllPeriods(false);
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

  // Submit bulletins for class
  const handleSubmitBulletin = async (sendToParents: boolean, sendToStudents: boolean) => {
    if (!summaryClassId) {
      alert("Veuillez sélectionner une classe d'abord");
      return;
    }
    if (!currentUser?.school_id) {
      alert("Erreur: ID de l'école non trouvé. Veuillez vous reconnecter.");
      return;
    }
    setSubmittingBulletin(true);
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Session expirée. Veuillez vous reconnecter.");
        setSubmittingBulletin(false);
        return;
      }
      
      const schoolId = currentUser.school_id || currentUser?.schoolId || currentUser?.id_ecole;
      console.log("Submitting bulletin for:", { class_id: summaryClassId, period: summaryPeriod, school_id: schoolId });
      
      const res = await fetch("/api/grades/submit-class-bulletin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          class_id: summaryClassId,
          period: summaryPeriod,
          school_id: schoolId,
          send_to_parent: sendToParents,
          send_to_student: sendToStudents,
        }),
      });
      
      const data = await res.json();
      console.log("Response:", data);
      
      if (res.ok) {
        setSuccess(`✅ Bulletins publiés! ${data.messages_sent || 0} messages envoyés.`);
      } else {
        throw new Error(data.error || "Erreur lors de la publication");
      }
    } catch (err: any) {
      console.error("Bulletin error:", err);
      setError(err.message || "Erreur inconnue");
    } finally {
      setSubmittingBulletin(false);
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
        <button style={tabStyle(activeTab === "thresholds")} onClick={() => setActiveTab("thresholds")}>🏫 Seuils Ecole</button>
        <button style={tabStyle(activeTab === "courses")} onClick={() => setActiveTab("courses")}>📚 Coefficients</button>
        <button style={tabStyle(activeTab === "results")} onClick={() => setActiveTab("results")}>🏆 Résultats</button>
      </div>

      {/* ===================== TAB: THRESHOLDS (SCHOOL ADMIN) ===================== */}
      {activeTab === "thresholds" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>🏫 Configuration des Seuils de l&apos;Ecole</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
              Ces seuils s&apos;appliquent à toute l&apos;école pour décider si l&apos;élève passe, redouble ou double.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Pourcentage de Réussite (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={schoolThresholds.pass_percentage}
                  onChange={(e) => setSchoolThresholds({ ...schoolThresholds, pass_percentage: Number(e.target.value) })}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Seuil minimum pour passer en classe supérieure</p>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>
                  Seuil Double (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={schoolThresholds.double_percentage}
                  onChange={(e) => setSchoolThresholds({ ...schoolThresholds, double_percentage: Number(e.target.value) })}
                  style={inputStyle}
                />
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>En-dessous de ce seuil = Double (redouble l'année)</p>
              </div>
            </div>
            <p style={{ fontSize: 12, color: "#dc2626", marginTop: 12 }}>⚠️ Primaire: Pas de repêchage - en dessous du seuil = Double directement</p>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
              <button style={{ ...btnPrimary, opacity: savingThresholds ? 0.6 : 1 }} disabled={savingThresholds} onClick={handleSaveThresholds}>
                {savingThresholds ? "Sauvegarde..." : "💾 Sauvegarder Seuils"}
              </button>
            </div>
          </div>

          {/* Info box - Primaire structure */}
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14,
            padding: "16px 20px", fontSize: 13, color: "#1e40af",
          }}>
            <strong>ℹ️ Structure Primaire (3 Trimestres):</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li><strong>1er Trimestre:</strong> P1 + P2 + Examen 1</li>
              <li><strong>2ème Trimestre:</strong> P3 + P4 + Examen 2</li>
              <li><strong>3ème Trimestre:</strong> P5 + P6 + Examen 3</li>
              <li><strong>Total Général:</strong> T1 + T2 + T3</li>
              <li><strong>Décision:</strong> Si Total ≥ seuil → Passe | Sinon → Redouble</li>
            </ul>
            <div style={{ marginTop: 10 }}>
              <strong>Mentions:</strong> ≥50% Suffisant | ≥60% Distinction | ≥70% Grande Distinction | ≥80% Très Grande Distinction
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
                  style={{ ...inputStyle, width: 220, background: "#fff" }}
                  value={summaryPeriod}
                  onChange={(e) => setSummaryPeriod(Number(e.target.value))}
                >
                  <optgroup label="Trimestre 1">
                    <option value={1}>📄 Bulletin P1</option>
                    <option value={2}>📄 Bulletin P2</option>
                    <option value={3}>📝 Examen T1</option>
                    <option value={10}>📊 Total Trimestre 1</option>
                  </optgroup>
                  <optgroup label="Trimestre 2">
                    <option value={4}>📄 Bulletin P4</option>
                    <option value={5}>📄 Bulletin P5</option>
                    <option value={6}>📝 Examen T2</option>
                    <option value={11}>📊 Total Trimestre 2</option>
                  </optgroup>
                  <optgroup label="Trimestre 3">
                    <option value={7}>📄 Bulletin P7</option>
                    <option value={8}>📄 Bulletin P8</option>
                    <option value={9}>📝 Examen T3</option>
                    <option value={12}>📊 Total Trimestre 3</option>
                  </optgroup>
                  <optgroup label="Bulletin Annuel">
                    <option value={0}>📋 Bulletin Annuel</option>
                  </optgroup>
                </select>
              </div>
              <button style={btnPrimary} onClick={fetchClassSummary} disabled={!summaryClassId || loadingSummary}>
                {loadingSummary ? "Chargement..." : "📊 Voir Résultats"}
              </button>
              {/* Bulletin buttons - only show after results are loaded */}
              {summaryData && (
                <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                  <button
                    style={{ ...btnPrimary, background: "linear-gradient(135deg, #059669, #047857)" }}
                    onClick={() => { console.log("Click Parents", summaryClassId, summaryPeriod); handleSubmitBulletin(true, false); }}
                    disabled={submittingBulletin || !summaryClassId}
                    title="Envoyer uniquement aux parents"
                  >
                    {submittingBulletin ? "..." : "👤 Parents"}
                  </button>
                  <button
                    style={{ ...btnPrimary, background: "linear-gradient(135deg, #dc2626, #b91c1c)" }}
                    onClick={() => handleSubmitBulletin(false, true)}
                    disabled={submittingBulletin || !summaryClassId}
                    title="Envoyer uniquement aux élèves"
                  >
                    {submittingBulletin ? "..." : "👦 Élèves"}
                  </button>
                  <button
                    style={{ ...btnPrimary, background: "linear-gradient(135deg, #7c3aed, #6d28d9)" }}
                    onClick={() => handleSubmitBulletin(true, true)}
                    disabled={submittingBulletin || !summaryClassId}
                    title="Envoyer aux parents et aux élèves"
                  >
                    {submittingBulletin ? "..." : "📤 Tous"}
                  </button>
                </div>
              )}
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
                {/* First Student (1er de classe) */}
                {summaryData.students && summaryData.students.length > 0 && (
                  <div style={{ background: "#ecfdf5", border: "1px solid #6ee7b7", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#065f46" }}>🥇 1er</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#065f46", marginTop: 4 }}>{summaryData.students[0]?.student_name}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#059669" }}>{summaryData.students[0]?.percentage}%</div>
                  </div>
                )}
                {/* Last Student (dernier de classe) */}
                {summaryData.students && summaryData.students.length > 0 && (
                  <div style={{ background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b" }}>🔻 Dernier</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#991b1b", marginTop: 4 }}>{summaryData.students[summaryData.students.length - 1]?.student_name}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#dc2626" }}>{summaryData.students[summaryData.students.length - 1]?.percentage}%</div>
                  </div>
                )}
                {/* Class Average */}
                {summaryData.students && summaryData.students.length > 0 && (
                  <div style={{ background: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: 12, padding: "12px 20px", textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#374151" }}>📊 Moyenne Classe</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#1f2937", marginTop: 4 }}>
                      {Math.round(summaryData.students.reduce((sum: number, s: ClassSummaryStudent) => sum + s.percentage, 0) / summaryData.students.length)}%
                    </div>
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

          {/* ===================== ALL PERIOD TRANSCRIPTS ===================== */}
          <div style={{ marginTop: 24, padding: 20, background: "#f8fafc", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#1e40af" }}>📋 Bulletins & Totaux Trimestres</h3>
              <button 
                style={{ ...btnPrimary, fontSize: 12, padding: "8px 16px" }}
                onClick={fetchAllPeriods}
                disabled={loadingAllPeriods || !summaryClassId}
              >
                {loadingAllPeriods ? "Chargement..." : "🔄 Charger Tous les Bulletins"}
              </button>
            </div>

            {Object.keys(allPeriodsData).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {/* Period 1 - P1 */}
                {allPeriodsData[1] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P1</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[1].passed_count}/{allPeriodsData[1].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[1].total_students > 0 ? Math.round((allPeriodsData[1].passed_count / allPeriodsData[1].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 2 - P2 */}
                {allPeriodsData[2] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P2</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[2].passed_count}/{allPeriodsData[2].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[2].total_students > 0 ? Math.round((allPeriodsData[2].passed_count / allPeriodsData[2].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 3 - Examen T1 */}
                {allPeriodsData[3] && (
                  <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>📝 Examen T1</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[3].passed_count}/{allPeriodsData[3].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#7c3aed" }}>
                      {allPeriodsData[3].total_students > 0 ? Math.round((allPeriodsData[3].passed_count / allPeriodsData[3].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 10 - Total Trimestre 1 */}
                {allPeriodsData[10] && (
                  <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: 8, padding: 12, color: "white" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>📊 Total Trimestre 1</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Réussi: {allPeriodsData[10].passed_count}/{allPeriodsData[10].total_students}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {allPeriodsData[10].total_students > 0 ? Math.round((allPeriodsData[10].passed_count / allPeriodsData[10].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 4 - P4 */}
                {allPeriodsData[4] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P4</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[4].passed_count}/{allPeriodsData[4].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[4].total_students > 0 ? Math.round((allPeriodsData[4].passed_count / allPeriodsData[4].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 5 - P5 */}
                {allPeriodsData[5] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P5</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[5].passed_count}/{allPeriodsData[5].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[5].total_students > 0 ? Math.round((allPeriodsData[5].passed_count / allPeriodsData[5].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 6 - Examen T2 */}
                {allPeriodsData[6] && (
                  <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>📝 Examen T2</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[6].passed_count}/{allPeriodsData[6].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#7c3aed" }}>
                      {allPeriodsData[6].total_students > 0 ? Math.round((allPeriodsData[6].passed_count / allPeriodsData[6].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 11 - Total Trimestre 2 */}
                {allPeriodsData[11] && (
                  <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: 8, padding: 12, color: "white" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>📊 Total Trimestre 2</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Réussi: {allPeriodsData[11].passed_count}/{allPeriodsData[11].total_students}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {allPeriodsData[11].total_students > 0 ? Math.round((allPeriodsData[11].passed_count / allPeriodsData[11].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 7 - P7 */}
                {allPeriodsData[7] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P7</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[7].passed_count}/{allPeriodsData[7].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[7].total_students > 0 ? Math.round((allPeriodsData[7].passed_count / allPeriodsData[7].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 8 - P8 */}
                {allPeriodsData[8] && (
                  <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>📄 Bulletin P8</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[8].passed_count}/{allPeriodsData[8].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#1e40af" }}>
                      {allPeriodsData[8].total_students > 0 ? Math.round((allPeriodsData[8].passed_count / allPeriodsData[8].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 9 - Examen T3 */}
                {allPeriodsData[9] && (
                  <div style={{ background: "#f5f3ff", border: "1px solid #c4b5fd", borderRadius: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#7c3aed", marginBottom: 8 }}>📝 Examen T3</div>
                    <div style={{ fontSize: 12, color: "#6b7280" }}>Réussi: {allPeriodsData[9].passed_count}/{allPeriodsData[9].total_students}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#7c3aed" }}>
                      {allPeriodsData[9].total_students > 0 ? Math.round((allPeriodsData[9].passed_count / allPeriodsData[9].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Period 12 - Total Trimestre 3 */}
                {allPeriodsData[12] && (
                  <div style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", borderRadius: 8, padding: 12, color: "white" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>📊 Total Trimestre 3</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Réussi: {allPeriodsData[12].passed_count}/{allPeriodsData[12].total_students}</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>
                      {allPeriodsData[12].total_students > 0 ? Math.round((allPeriodsData[12].passed_count / allPeriodsData[12].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
                {/* Annual - Bulletin Annuel */}
                {allPeriodsData[0] && (
                  <div style={{ background: "linear-gradient(135deg, #059669, #047857)", borderRadius: 8, padding: 12, color: "white" }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>📋 Bulletin Annuel</div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Réussi: {allPeriodsData[0].passed_count}/{allPeriodsData[0].total_students}</div>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>
                      {allPeriodsData[0].total_students > 0 ? Math.round((allPeriodsData[0].passed_count / allPeriodsData[0].total_students) * 100) : 0}%
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
