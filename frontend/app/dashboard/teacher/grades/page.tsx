"use client";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type Student = {
  id: number;
  name: string;
  unique_id: string;
};

type Course = {
  id: number;
  name: string;
  teacher_id: number;
  teacher_name: string;
  classes: { class_id: number; name: string }[];
};

type CourseConfig = {
  course_id: number;
  class_id: number;
  coefficient: number;
  max_score: number;
  course_name: string;
};

type GradeEntry = {
  id: number;
  student_id: number;
  student_name: string;
  course_id: number;
  course_name: string;
  period: number;
  grade_type: string;
  score: number;
  max_score: number;
  description: string;
  grade_date: string;
};

type BulletinCourse = {
  course_id: number;
  course_name: string;
  coefficient: number;
  max_score: number;
  interro_avg: number | null;
  devoir_avg: number | null;
  examen_avg: number | null;
  course_avg: number | null;
  points_obtained: number | null;
  points_possible: number;
  interro_count: number;
  devoir_count: number;
  examen_count: number;
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

export default function TeacherGradesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseConfigs, setCourseConfigs] = useState<CourseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"enter" | "view" | "bulletin" | "summary" | "config">("enter");

  // Grade entry state
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState(1);
  const [gradeType, setGradeType] = useState<"interro" | "devoir" | "examen">("interro");
  const [maxScore, setMaxScore] = useState(10);
  const [gradeDescription, setGradeDescription] = useState("");
  const [gradeDate, setGradeDate] = useState(new Date().toISOString().split("T")[0]);
  const [studentScores, setStudentScores] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // View grades state
  const [viewPeriod, setViewPeriod] = useState(1);
  const [viewCourseId, setViewCourseId] = useState<number | null>(null);
  const [existingGrades, setExistingGrades] = useState<GradeEntry[]>([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  // Bulletin state
  const [bulletinStudentId, setBulletinStudentId] = useState<number | null>(null);
  const [bulletinPeriod, setBulletinPeriod] = useState<number | null>(1);
  const [bulletinData, setBulletinData] = useState<any>(null);
  const [loadingBulletin, setLoadingBulletin] = useState(false);

  // Class summary state
  const [summaryPeriod, setSummaryPeriod] = useState(1);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Config state
  const [configCoefficients, setConfigCoefficients] = useState<Record<number, { coefficient: number; max_score: number }>>({});
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  // Find teacher's class
  useEffect(() => {
    if (!currentUser?.id || !currentUser?.school_id) {
      setLoading(false);
      return;
    }
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");

        // Get classes
        const classRes = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!classRes.ok) throw new Error("Impossible de charger les classes");
        const classData = await classRes.json();
        const cls = (classData.classes || []).find((c: any) => c.main_teacher_id === currentUser.id);

        if (!cls) {
          setLoading(false);
          return;
        }

        setClassId(cls.id);
        setClassName(cls.name);

        // Get students
        const usersRes = await fetch(`${API_URL}/api/users/?school_id=${currentUser.school_id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (usersRes.ok) {
          const ud = await usersRes.json();
          const studentList = (ud.users || [])
            .filter((u: any) => u.role === "STUDENT" && String(u.class_id) === String(cls.id))
            .map((u: any) => ({ id: u.id, name: u.name, unique_id: u.unique_id || "" }))
            .sort((a: Student, b: Student) => a.name.localeCompare(b.name));
          setStudents(studentList);
        }

        // Get courses for this class
        const coursesRes = await fetch(`/api/schools/${currentUser.school_id}/teacher-courses`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (coursesRes.ok) {
          const cd = await coursesRes.json();
          const allCourses = cd.courses || [];
          // Filter courses that belong to this class
          const classCourses = allCourses.filter((c: any) =>
            (c.classes || []).some((cc: any) => cc.class_id === cls.id)
          );
          setCourses(classCourses);
        }

        // Get course configs
        const configRes = await fetch(`/api/grades/course-config?class_id=${cls.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (configRes.ok) {
          const cfgData = await configRes.json();
          setCourseConfigs(cfgData.configs || []);
          // Initialize config state
          const cfgMap: Record<number, { coefficient: number; max_score: number }> = {};
          for (const cfg of cfgData.configs || []) {
            cfgMap[cfg.course_id] = { coefficient: cfg.coefficient, max_score: cfg.max_score };
          }
          setConfigCoefficients(cfgMap);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [currentUser]);

  // Auto-clear messages
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  // ===================== SUBMIT GRADES =====================
  const handleSubmitGrades = async () => {
    if (!selectedCourseId || !classId) return;
    const grades = Object.entries(studentScores)
      .filter(([, score]) => score !== "" && score !== undefined)
      .map(([studentId, score]) => ({
        student_id: Number(studentId),
        score: parseFloat(score),
      }));

    if (grades.length === 0) {
      setError("Veuillez entrer au moins une note");
      return;
    }

    // Validate scores
    for (const g of grades) {
      if (isNaN(g.score) || g.score < 0 || g.score > maxScore) {
        setError(`Note invalide pour un élève. La note doit être entre 0 et ${maxScore}`);
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/grades/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          course_id: selectedCourseId,
          class_id: classId,
          period: selectedPeriod,
          grade_type: gradeType,
          max_score: maxScore,
          description: gradeDescription,
          grade_date: gradeDate,
          grades,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Erreur lors de l'enregistrement");
      }
      const data = await res.json();
      setSuccess(`${data.count} note(s) enregistrée(s) avec succès!`);
      setStudentScores({});
      setGradeDescription("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ===================== FETCH EXISTING GRADES =====================
  const fetchExistingGrades = async () => {
    if (!classId) return;
    setLoadingGrades(true);
    try {
      const token = localStorage.getItem("token");
      let url = `/api/grades?class_id=${classId}&period=${viewPeriod}`;
      if (viewCourseId) url += `&course_id=${viewCourseId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setExistingGrades(data.grades || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingGrades(false);
    }
  };

  useEffect(() => {
    if (activeTab === "view" && classId) fetchExistingGrades();
  }, [activeTab, viewPeriod, viewCourseId, classId]);

  // ===================== FETCH BULLETIN =====================
  const fetchBulletin = async () => {
    if (!bulletinStudentId || !classId) return;
    setLoadingBulletin(true);
    setBulletinData(null);
    try {
      const token = localStorage.getItem("token");
      let url = `/api/grades/bulletin?student_id=${bulletinStudentId}&class_id=${classId}&school_id=${currentUser?.school_id}`;
      if (bulletinPeriod) url += `&period=${bulletinPeriod}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setBulletinData(data.bulletin);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingBulletin(false);
    }
  };

  // ===================== FETCH CLASS SUMMARY =====================
  const fetchClassSummary = async () => {
    if (!classId) return;
    setLoadingSummary(true);
    setSummaryData(null);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `/api/grades/class-summary?class_id=${classId}&period=${summaryPeriod}&school_id=${currentUser?.school_id}`,
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

  // ===================== SAVE COURSE CONFIGS =====================
  const handleSaveConfigs = async () => {
    if (!classId) return;
    setSavingConfig(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const configs = courses.map((c) => ({
        course_id: c.id,
        class_id: classId,
        coefficient: configCoefficients[c.id]?.coefficient || 1,
        max_score: configCoefficients[c.id]?.max_score || 10,
      }));
      const res = await fetch("/api/grades/course-config/bulk", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ configs }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setSuccess("Configuration des cours sauvegardée!");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingConfig(false);
    }
  };

  // ===================== DELETE GRADE =====================
  const handleDeleteGrade = async (gradeId: number) => {
    if (!confirm("Supprimer cette note?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/grades/${gradeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setSuccess("Note supprimée");
        fetchExistingGrades();
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ===================== STYLES =====================
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
    borderBottom: active ? "3px solid #10b981" : "3px solid transparent",
    background: active ? "#f0fdf4" : "transparent",
    color: active ? "#065f46" : "#6b7280",
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

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    background: "#fff",
  };

  const btnPrimary: React.CSSProperties = {
    background: "linear-gradient(135deg, #10b981, #059669)",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "12px 24px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    transition: "all 0.2s",
  };

  const btnSecondary: React.CSSProperties = {
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
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

  // ===================== RENDER =====================

  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
        <p style={{ color: "#6b7280" }}>Chargement...</p>
      </div>
    );
  }

  if (!classId) {
    return (
      <div style={{ maxWidth: 900, margin: "0 auto", padding: 20, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>📭</div>
        <p style={{ color: "#9ca3af" }}>Aucune classe ne vous est assignée. Contactez l&apos;administrateur.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: 20 }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #0f4c3a 0%, #10b981 50%, #059669 100%)",
        borderRadius: 20, padding: "24px 28px", color: "#fff", marginBottom: 20,
        boxShadow: "0 12px 40px rgba(16,185,129,0.2)",
      }}>
        <h1 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800 }}>📝 Notes & Bulletins</h1>
        <p style={{ margin: 0, opacity: 0.85, fontSize: 14 }}>
          Classe: <strong>{className}</strong> — {students.length} élève{students.length !== 1 ? "s" : ""} — {courses.length} cours
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
      <div style={{ display: "flex", gap: 4, marginBottom: 20, overflowX: "auto", borderBottom: "1px solid #e5e7eb" }}>
        <button style={tabStyle(activeTab === "enter")} onClick={() => setActiveTab("enter")}>📝 Saisir Notes</button>
        <button style={tabStyle(activeTab === "view")} onClick={() => setActiveTab("view")}>📋 Voir Notes</button>
        <button style={tabStyle(activeTab === "bulletin")} onClick={() => setActiveTab("bulletin")}>📊 Bulletin</button>
        <button style={tabStyle(activeTab === "summary")} onClick={() => setActiveTab("summary")}>🏆 Classement</button>
        <button style={tabStyle(activeTab === "config")} onClick={() => setActiveTab("config")}>⚙️ Configuration</button>
      </div>

      {/* ===================== TAB: ENTER GRADES ===================== */}
      {activeTab === "enter" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>Saisie des notes</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période *</label>
                <select style={selectStyle} value={selectedPeriod} onChange={(e) => setSelectedPeriod(Number(e.target.value))}>
                  <option value={1}>1ère Période (T1)</option>
                  <option value={2}>2ème Période (T2)</option>
                  <option value={3}>3ème Période (T3)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Cours *</label>
                <select style={selectStyle} value={selectedCourseId ?? ""} onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- Choisir un cours --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Type *</label>
                <select style={selectStyle} value={gradeType} onChange={(e) => setGradeType(e.target.value as any)}>
                  <option value="interro">Interrogation</option>
                  <option value="devoir">Devoir</option>
                  <option value="examen">Examen</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Cote max /{maxScore}</label>
                <input type="number" style={inputStyle} value={maxScore} min={1} max={100}
                  onChange={(e) => setMaxScore(Number(e.target.value))} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" style={inputStyle} value={gradeDate} onChange={(e) => setGradeDate(e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Description</label>
                <input type="text" style={inputStyle} value={gradeDescription} placeholder="Ex: Interro chapitre 3"
                  onChange={(e) => setGradeDescription(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Student scores table */}
          {selectedCourseId && (
            <div style={cardStyle}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "#111827" }}>
                Notes des élèves — {courses.find((c) => c.id === selectedCourseId)?.name} — {gradeType === "interro" ? "Interrogation" : gradeType === "devoir" ? "Devoir" : "Examen"} /{maxScore}
              </h3>

              {students.length === 0 ? (
                <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun élève dans cette classe.</p>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700, color: "#374151" }}>#</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700, color: "#374151" }}>Nom de l&apos;élève</th>
                          <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700, color: "#374151" }}>ID</th>
                          <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, color: "#374151", width: 120 }}>Note /{maxScore}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, idx) => (
                          <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                            <td style={{ padding: "8px 12px", color: "#6b7280" }}>{idx + 1}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 600, color: "#111827" }}>{s.name}</td>
                            <td style={{ padding: "8px 12px", fontFamily: "monospace", fontSize: 12, color: "#6b7280" }}>{s.unique_id}</td>
                            <td style={{ padding: "8px 12px", textAlign: "center" }}>
                              <input
                                type="number"
                                min={0}
                                max={maxScore}
                                step={0.5}
                                value={studentScores[s.id] ?? ""}
                                onChange={(e) => setStudentScores((prev) => ({ ...prev, [s.id]: e.target.value }))}
                                style={{
                                  width: 80,
                                  padding: "8px 10px",
                                  border: "2px solid #d1d5db",
                                  borderRadius: 8,
                                  fontSize: 15,
                                  fontWeight: 700,
                                  textAlign: "center",
                                  outline: "none",
                                  transition: "border-color 0.2s",
                                }}
                                onFocus={(e) => (e.target.style.borderColor = "#10b981")}
                                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                                placeholder="—"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", gap: 12, marginTop: 16, justifyContent: "flex-end" }}>
                    <button style={btnSecondary} onClick={() => setStudentScores({})}>Effacer tout</button>
                    <button style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1 }} disabled={submitting} onClick={handleSubmitGrades}>
                      {submitting ? "Enregistrement..." : `💾 Enregistrer ${Object.values(studentScores).filter((v) => v !== "").length} note(s)`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: VIEW GRADES ===================== */}
      {activeTab === "view" && (
        <div>
          <div style={cardStyle}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
                <select style={{ ...selectStyle, width: 180 }} value={viewPeriod} onChange={(e) => setViewPeriod(Number(e.target.value))}>
                  <option value={1}>1ère Période (T1)</option>
                  <option value={2}>2ème Période (T2)</option>
                  <option value={3}>3ème Période (T3)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Cours</label>
                <select style={{ ...selectStyle, width: 200 }} value={viewCourseId ?? ""} onChange={(e) => setViewCourseId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">Tous les cours</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingGrades && <p style={{ color: "#6b7280" }}>Chargement...</p>}

            {!loadingGrades && existingGrades.length === 0 && (
              <div style={{ textAlign: "center", padding: 30, color: "#9ca3af" }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
                <p>Aucune note trouvée pour cette période.</p>
              </div>
            )}

            {!loadingGrades && existingGrades.length > 0 && (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Élève</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Cours</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Type</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Note</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: "2px solid #e5e7eb" }}>Description</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Date</th>
                      <th style={{ padding: "8px 10px", textAlign: "center", borderBottom: "2px solid #e5e7eb" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingGrades.map((g) => (
                      <tr key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 10px", fontWeight: 600 }}>{g.student_name}</td>
                        <td style={{ padding: "8px 10px" }}>{g.course_name}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: g.grade_type === "interro" ? "#dbeafe" : g.grade_type === "devoir" ? "#fef3c7" : "#ede9fe",
                            color: g.grade_type === "interro" ? "#1e40af" : g.grade_type === "devoir" ? "#92400e" : "#5b21b6",
                          }}>
                            {g.grade_type === "interro" ? "Interro" : g.grade_type === "devoir" ? "Devoir" : "Examen"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                          {g.score}/{g.max_score}
                        </td>
                        <td style={{ padding: "8px 10px", color: "#6b7280", fontSize: 12 }}>{g.description || "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center", fontSize: 12, color: "#6b7280" }}>{g.grade_date || "—"}</td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <button onClick={() => handleDeleteGrade(g.id)} style={{
                            background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 6,
                            padding: "4px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600,
                          }}>🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
                  Total: {existingGrades.length} note(s)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===================== TAB: BULLETIN ===================== */}
      {activeTab === "bulletin" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>📊 Bulletin de l&apos;élève</h3>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Élève *</label>
                <select style={{ ...selectStyle, width: 250 }} value={bulletinStudentId ?? ""} onChange={(e) => setBulletinStudentId(e.target.value ? Number(e.target.value) : null)}>
                  <option value="">-- Choisir un élève --</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.unique_id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
                <select style={{ ...selectStyle, width: 180 }} value={bulletinPeriod ?? ""} onChange={(e) => setBulletinPeriod(e.target.value ? Number(e.target.value) : null)}>
                  <option value={1}>1ère Période (T1)</option>
                  <option value={2}>2ème Période (T2)</option>
                  <option value={3}>3ème Période (T3)</option>
                  <option value="">Annuel</option>
                </select>
              </div>
              <button style={btnPrimary} onClick={fetchBulletin} disabled={!bulletinStudentId || loadingBulletin}>
                {loadingBulletin ? "Chargement..." : "📊 Générer Bulletin"}
              </button>
            </div>
          </div>

          {loadingBulletin && <p style={{ color: "#6b7280" }}>Chargement du bulletin...</p>}

          {bulletinData && bulletinData.type === "period" && (
            <div style={cardStyle}>
              {/* Bulletin Header */}
              <div style={{
                background: "linear-gradient(135deg, #1e3a5f, #2563eb)",
                borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
                textAlign: "center",
              }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>BULLETIN SCOLAIRE</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
                  {bulletinData.student?.name} — {bulletinData.class?.name} — {bulletinData.period}ème Période
                </p>
              </div>

              {/* Courses table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f0f9ff" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Cours</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Coeff.</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Max</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Moy. Interro</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Moy. Devoir</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Moy. Cours</th>
                      <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #bfdbfe", fontWeight: 700 }}>Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(bulletinData.courses || []).map((c: BulletinCourse) => (
                      <tr key={c.course_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.course_name}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280" }}>×{c.coefficient}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", color: "#6b7280" }}>/{c.max_score}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {c.interro_avg !== null ? (
                            <span style={{ fontWeight: 600 }}>{c.interro_avg}</span>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—</span>
                          )}
                          {c.interro_count > 0 && <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>({c.interro_count})</span>}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center" }}>
                          {c.devoir_avg !== null ? (
                            <span style={{ fontWeight: 600 }}>{c.devoir_avg}</span>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—</span>
                          )}
                          {c.devoir_count > 0 && <span style={{ fontSize: 10, color: "#9ca3af", marginLeft: 4 }}>({c.devoir_count})</span>}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                          {c.course_avg !== null ? c.course_avg : <span style={{ color: "#d1d5db" }}>—</span>}
                        </td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, fontSize: 14 }}>
                          {c.points_obtained !== null ? (
                            <span>{c.points_obtained}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{c.points_possible}</span></span>
                          ) : (
                            <span style={{ color: "#d1d5db" }}>—/{c.points_possible}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "#f9fafb", fontWeight: 700 }}>
                      <td colSpan={6} style={{ padding: "12px", textAlign: "right", fontSize: 15 }}>TOTAL</td>
                      <td style={{ padding: "12px", textAlign: "center", fontSize: 16 }}>
                        {bulletinData.total_obtained}<span style={{ color: "#9ca3af", fontWeight: 400 }}>/{bulletinData.total_possible}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Summary */}
              <div style={{
                display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", justifyContent: "center",
              }}>
                <div style={{
                  background: "#f0f9ff", border: "2px solid #bfdbfe", borderRadius: 14,
                  padding: "16px 24px", textAlign: "center", minWidth: 140,
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#1e40af" }}>{bulletinData.percentage}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Pourcentage</div>
                </div>
                <div style={{
                  background: getMentionBg(bulletinData.mention),
                  border: `2px solid ${getMentionColor(bulletinData.mention)}20`,
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: getMentionColor(bulletinData.mention) }}>{bulletinData.mention}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Mention</div>
                </div>
                <div style={{
                  background: bulletinData.passed ? "#f0fdf4" : "#fef2f2",
                  border: `2px solid ${bulletinData.passed ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 140,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: bulletinData.passed ? "#166534" : "#991b1b" }}>
                    {bulletinData.passed ? "✅ RÉUSSI" : "❌ ÉCHEC"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Seuil: {bulletinData.pass_percentage}%</div>
                </div>
              </div>
            </div>
          )}

          {bulletinData && bulletinData.type === "annual" && (
            <div style={cardStyle}>
              <div style={{
                background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                borderRadius: 14, padding: "20px 24px", color: "#fff", marginBottom: 20,
                textAlign: "center",
              }}>
                <h2 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 800 }}>BULLETIN ANNUEL</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
                  {bulletinData.student?.name} — {bulletinData.class?.name}
                </p>
              </div>

              {(bulletinData.periods || []).map((p: any) => (
                <div key={p.period} style={{ marginBottom: 16, border: "1px solid #e5e7eb", borderRadius: 12, overflow: "hidden" }}>
                  <div style={{ background: "#f9fafb", padding: "10px 16px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Période {p.period}</strong>
                    <span style={{
                      padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                      background: getMentionBg(p.mention), color: getMentionColor(p.mention),
                    }}>
                      {p.percentage}% — {p.mention}
                    </span>
                  </div>
                  <div style={{ padding: "8px 16px", fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>Total: {p.total_obtained}/{p.total_possible}</span>
                  </div>
                </div>
              ))}

              <div style={{
                display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", justifyContent: "center",
              }}>
                <div style={{
                  background: "#f5f3ff", border: "2px solid #c4b5fd", borderRadius: 14,
                  padding: "16px 24px", textAlign: "center", minWidth: 160,
                }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "#7c3aed" }}>{bulletinData.annual_percentage}%</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Moyenne Annuelle</div>
                </div>
                <div style={{
                  background: getMentionBg(bulletinData.annual_mention),
                  border: `2px solid ${getMentionColor(bulletinData.annual_mention)}20`,
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 160,
                }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: getMentionColor(bulletinData.annual_mention) }}>{bulletinData.annual_mention}</div>
                  <div style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: 1 }}>Mention</div>
                </div>
                <div style={{
                  background: bulletinData.passed ? "#f0fdf4" : "#fef2f2",
                  border: `2px solid ${bulletinData.passed ? "#bbf7d0" : "#fecaca"}`,
                  borderRadius: 14, padding: "16px 24px", textAlign: "center", minWidth: 160,
                }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: bulletinData.passed ? "#166534" : "#991b1b" }}>
                    {bulletinData.passed ? "✅ RÉUSSI" : "❌ ÉCHEC"}
                  </div>
                  <div style={{ fontSize: 11, color: "#6b7280" }}>Seuil: {bulletinData.pass_percentage}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB: CLASS SUMMARY ===================== */}
      {activeTab === "summary" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>🏆 Classement de la classe</h3>

            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-end" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 4 }}>Période</label>
                <select style={{ ...selectStyle, width: 180 }} value={summaryPeriod} onChange={(e) => setSummaryPeriod(Number(e.target.value))}>
                  <option value={1}>1ère Période (T1)</option>
                  <option value={2}>2ème Période (T2)</option>
                  <option value={3}>3ème Période (T3)</option>
                </select>
              </div>
              <button style={btnPrimary} onClick={fetchClassSummary} disabled={loadingSummary}>
                {loadingSummary ? "Chargement..." : "📊 Voir Classement"}
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

      {/* ===================== TAB: CONFIG ===================== */}
      {activeTab === "config" && (
        <div>
          <div style={cardStyle}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, color: "#111827" }}>⚙️ Configuration des cours</h3>
            <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
              Définissez le coefficient et la cote maximale pour chaque cours de votre classe.
              Le coefficient détermine l&apos;importance du cours dans le calcul du total.
            </p>

            {courses.length === 0 ? (
              <p style={{ color: "#9ca3af", fontSize: 13 }}>Aucun cours assigné à cette classe.</p>
            ) : (
              <>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                    <thead>
                      <tr style={{ background: "#f9fafb" }}>
                        <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e5e7eb", fontWeight: 700 }}>Cours</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 120 }}>Coefficient</th>
                        <th style={{ padding: "10px 12px", textAlign: "center", borderBottom: "2px solid #e5e7eb", fontWeight: 700, width: 120 }}>Cote Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600 }}>{c.name}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <input
                              type="number"
                              min={1}
                              max={10}
                              value={configCoefficients[c.id]?.coefficient ?? 1}
                              onChange={(e) => setConfigCoefficients((prev) => ({
                                ...prev,
                                [c.id]: { ...prev[c.id], coefficient: Number(e.target.value), max_score: prev[c.id]?.max_score ?? 10 },
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
                              value={configCoefficients[c.id]?.max_score ?? 10}
                              onChange={(e) => setConfigCoefficients((prev) => ({
                                ...prev,
                                [c.id]: { ...prev[c.id], max_score: Number(e.target.value), coefficient: prev[c.id]?.coefficient ?? 1 },
                              }))}
                              style={{
                                width: 70, padding: "6px 8px", border: "2px solid #d1d5db",
                                borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center",
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <button style={{ ...btnPrimary, opacity: savingConfig ? 0.6 : 1 }} disabled={savingConfig} onClick={handleSaveConfigs}>
                    {savingConfig ? "Sauvegarde..." : "💾 Sauvegarder Configuration"}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Info box */}
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 14,
            padding: "16px 20px", fontSize: 13, color: "#1e40af",
          }}>
            <strong>ℹ️ Comment fonctionne le calcul des points (Primaire RDC):</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 20, lineHeight: 1.8 }}>
              <li><strong>Coefficient:</strong> Importance du cours (ex: Math ×3, Français ×2)</li>
              <li><strong>Cote max:</strong> Note maximale possible (ex: /10, /20)</li>
              <li><strong>Points = Moyenne du cours × Coefficient</strong></li>
              <li><strong>Pourcentage = (Total obtenu ÷ Total possible) × 100</strong></li>
              <li><strong>Moyenne période = (Moy. Interros × 50%) + (Moy. Devoirs × 50%)</strong></li>
              <li><strong>Moyenne annuelle = (P1 + P2 + P3) ÷ 3</strong></li>
            </ul>
            <div style={{ marginTop: 10 }}>
              <strong>Mentions:</strong> 50% Suffisant | 60% Distinction | 70% Grande Distinction | 80%+ Très Grande Distinction
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
