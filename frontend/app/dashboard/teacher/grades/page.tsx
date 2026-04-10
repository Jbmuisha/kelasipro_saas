 "use client";
import { useEffect, useState, useCallback } from "react";
import { useEffectiveUser } from "@/utils/auth";

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
  const [effectiveUser, effectiveLoading] = useEffectiveUser();
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseConfigs, setCourseConfigs] = useState<CourseConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<"enter" | "view" | "bulletin" | "summary" | "semester" | "config">("enter");

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

  // Grade config for dynamic periods
const schoolType = localStorage.getItem('school_type') || 'primaire';
  const [gradeConfig, setGradeConfig]

  // Find teacher's class - FIXED: use effectiveUser, useCallback
  const fetchData = useCallback(async () => {
    if (effectiveLoading || !effectiveUser?.id || !effectiveUser?.school_id) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem("token");

      // Get classes
      const classRes = await fetch(`${API_URL}/api/classes/?school_id=${effectiveUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!classRes.ok) throw new Error("Impossible de charger les classes");
      const classData = await classRes.json();
      const cls = (classData.classes || []).find((c: any) => c.main_teacher_id === effectiveUser.id);

      if (!cls) {
        setLoading(false);
        return;
      }

      setClassId(cls.id);
      setClassName(cls.name);

      // Get students
      const usersRes = await fetch(`${API_URL}/api/users/?school_id=${effectiveUser.school_id}`, {
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
      const coursesRes = await fetch(`/api/schools/${effectiveUser.school_id}/teacher-courses`, {
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

      // Get grade config for dynamic periods
      const gradeRes = await fetch(`/api/grades/config?school_id=${effectiveUser.school_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (gradeRes.ok) {
        const gradeData = await gradeRes.json();
        setGradeConfig(gradeData.config);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [effectiveUser, effectiveLoading]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      let url = `/api/grades/bulletin?student_id=${bulletinStudentId}&class_id=${classId}&school_id=${effectiveUser?.school_id}`;
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
          `/api/grades/class-summary?class_id=${classId}&period=${summaryPeriod}&school_id=${effectiveUser?.school_id}`,
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
        <button style={tabStyle(activeTab === "semester")} onClick={() => setActiveTab("semester")}>📋 Semestre</button>
        <button style={tabStyle(activeTab === "summary")} onClick={() => setActiveTab("summary")}>🏆 Classement</button>
        <button style={tabStyle(activeTab === "config")} onClick={() => setActiveTab("config")}>⚙️ Configuration</button>
      </div>

      {/* TAB CONTENT */}
      {/* ... (rest of component unchanged) ... */}
    </div>
  );
}

