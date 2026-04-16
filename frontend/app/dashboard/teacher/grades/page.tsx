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
  const [sending, setSending] = useState(false);

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

  // Grade config form state
  const [gradeConfigForm, setGradeConfigForm] = useState({
    interro_weight: 50,
    devoir_weight: 50,
    examen_weight: 0,
    pass_percentage: 50,
    repech_percentage: 45,
    double_percentage: 55,
  });

  // Grade config for dynamic periods
  const [gradeConfig, setGradeConfig] = useState<{ periods: string[] } | null>(null);
  const [schoolType, setSchoolType] = useState('primaire');

  // Initialize school type from localStorage (client-side only)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSchoolType(localStorage.getItem('school_type') || 'primaire');
    }
  }, []);

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

  // ===================== SEND GRADES TO PARENTS =====================
  const handleSendToParents = async () => {
    if (!selectedCourseId || !classId) return;
    
    const grades = Object.entries(studentScores)
      .filter(([, score]) => score !== "" && score !== undefined)
      .map(([studentId, score]) => ({
        student_id: Number(studentId),
        score: parseFloat(score),
      }));

    if (grades.length === 0) {
      setError("Aucune note à envoyer. Veuillez d'abord saisir les notes.");
      return;
    }

    setSending(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      
      // Get course name for the message
      const course = courses.find(c => c.id === selectedCourseId);
      const courseName = course?.name || "Cours";
      const gradeTypeLabel = gradeType === "interro" ? "Interrogation" : gradeType === "devoir" ? "Devoir" : "Examen";
      
      // Send grades to each student/parent
      let sentCount = 0;
      for (const grade of grades) {
        const student = students.find(s => s.id === grade.student_id);
        if (!student) continue;
        
        const message = `📊 ${gradeTypeLabel} - ${courseName}\n\n` +
          `Élève: ${student.name}\n` +
          `Note: ${grade.score}/${maxScore}\n` +
          `Période: Trimestre ${selectedPeriod}\n` +
          `Date: ${gradeDate}`;
        
        const res = await fetch("/api/messages/send", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            recipient_id: student.id,
            message: message,
          }),
        });
        
        if (res.ok) {
          sentCount++;
        }
      }
      
      setSuccess(`📤 ${sentCount} notification(s) de notes envoyée(s) aux élèves!`);
    } catch (err: any) {
      setError(err.message || "Erreur lors de l'envoi des notifications");
    } finally {
      setSending(false);
    }
  };

  // ===================== SAVE GRADE CONFIG =====================
  const handleSaveGradeConfig = async () => {
    setSavingConfig(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      const configData = {
        interro_weight: parseFloat((document.querySelector('input[placeholder="Interrogation"]') as HTMLInputElement)?.value || '50'),
        devoir_weight: parseFloat((document.querySelector('input[placeholder="Devoir"]') as HTMLInputElement)?.value || '50'),
        examen_weight: parseFloat((document.querySelector('input[placeholder="Examen"]') as HTMLInputElement)?.value || '0'),
        pass_percentage: parseFloat((document.querySelector('input[placeholder="Pass"]') as HTMLInputElement)?.value || '50'),
        repech_percentage: parseFloat((document.querySelector('input[placeholder="Repêotage"]') as HTMLInputElement)?.value || '45'),
        double_percentage: parseFloat((document.querySelector('input[placeholder="Double"]') as HTMLInputElement)?.value || '55'),
      };
      
      const res = await fetch("/api/grades/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(configData),
      });
      
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || "Erreur lors de la sauvegarde");
      }
      
      setSuccess("✅ Configuration sauvegardée avec succès!");
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSavingConfig(false);
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
      {activeTab === "enter" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>📝 Saisir les notes</h3>
          {/* Grade entry form */}
          <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Période</label>
                <select 
                  value={selectedPeriod} 
                  onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  {[1,2,3].map(p => <option key={p} value={p}>Trimestre {p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Cours</label>
                <select 
                  value={selectedCourseId || ''} 
                  onChange={(e) => setSelectedCourseId(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  <option value="">Sélectionner un cours</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Type de note</label>
                <select 
                  value={gradeType} 
                  onChange={(e) => setGradeType(e.target.value as any)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  <option value="interro">Interrogation</option>
                  <option value="devoir">Devoir</option>
                  <option value="examen">Examen</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Note sur</label>
                <input 
                  type="number" 
                  value={maxScore} 
                  onChange={(e) => setMaxScore(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Description</label>
                <input 
                  type="text" 
                  value={gradeDescription} 
                  onChange={(e) => setGradeDescription(e.target.value)}
                  placeholder="Ex: Chapitre 3"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Date</label>
                <input 
                  type="date" 
                  value={gradeDate} 
                  onChange={(e) => setGradeDate(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                />
              </div>
            </div>
          </div>

          {/* Student scores */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Élèves ({students.length})</span>
              <button 
                onClick={handleSubmitGrades}
                disabled={submitting || !selectedCourseId}
                style={{ 
                  padding: '8px 16px', 
                  background: submitting || !selectedCourseId ? '#9ca3af' : '#10b981', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: submitting || !selectedCourseId ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                {submitting ? 'Enregistrement...' : '💾 Enregistrer'}
              </button>
              <button 
                onClick={handleSendToParents}
                disabled={sending || !selectedCourseId}
                style={{ 
                  padding: '8px 16px', 
                  background: sending || !selectedCourseId ? '#9ca3af' : '#3b82f6', 
                  color: '#fff', 
                  border: 'none', 
                  borderRadius: 8, 
                  cursor: sending || !selectedCourseId ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  marginLeft: 8
                }}
              >
                {sending ? 'Envoi...' : '📤 Envoyer aux parents'}
              </button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {students.length === 0 ? (
                <p style={{ padding: 20, color: '#6b7280', textAlign: 'center' }}>Aucun élève dans cette classe</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Élève</th>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>ID</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Note /{maxScore}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: 12, fontSize: 14 }}>{student.name}</td>
                        <td style={{ padding: 12, fontSize: 13, color: '#6b7280' }}>{student.unique_id}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max={maxScore}
                            value={studentScores[student.id] || ''}
                            onChange={(e) => setStudentScores({ ...studentScores, [student.id]: e.target.value })}
                            placeholder="-"
                            style={{
                              width: 80,
                              padding: '8px',
                              textAlign: 'center',
                              borderRadius: 6,
                              border: '1px solid #d1d5db'
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "view" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>📋 Voir les notes</h3>
          <div style={{ background: '#f9fafb', padding: 20, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Période</label>
                <select 
                  value={viewPeriod} 
                  onChange={(e) => setViewPeriod(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  {[1,2,3].map(p => <option key={p} value={p}>Trimestre {p}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Cours</label>
                <select 
                  value={viewCourseId || ''} 
                  onChange={(e) => setViewCourseId(Number(e.target.value))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                >
                  <option value="">Tous les cours</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button 
                  onClick={fetchExistingGrades}
                  style={{ 
                    width: '100%',
                    padding: '10px', 
                    background: '#3b82f6', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 8, 
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  🔍 Rechercher
                </button>
              </div>
            </div>
          </div>

          {loadingGrades ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Chargement...</p>
          ) : existingGrades.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#6b7280' }}>Aucune note trouvée</p>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <span style={{ fontWeight: 600 }}>{existingGrades.length} notes trouvées</span>
              </div>
              <div style={{ maxHeight: 500, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Date</th>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Élève</th>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Cours</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Type</th>
                      <th style={{ padding: 12, textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>Note</th>
                      <th style={{ padding: 12, textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {existingGrades.map((grade) => (
                      <tr key={grade.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: 12, fontSize: 13 }}>{grade.grade_date}</td>
                        <td style={{ padding: 12, fontSize: 14 }}>{grade.student_name}</td>
                        <td style={{ padding: 12, fontSize: 14 }}>{grade.course_name}</td>
                        <td style={{ padding: 12, textAlign: 'center' }}>
                          <span style={{ 
                            padding: '4px 8px', 
                            borderRadius: 4, 
                            fontSize: 12,
                            background: grade.grade_type === 'examen' ? '#dbeafe' : grade.grade_type === 'devoir' ? '#dcfce7' : '#fef3c7',
                            color: grade.grade_type === 'examen' ? '#1e40af' : grade.grade_type === 'devoir' ? '#166534' : '#92400e'
                          }}>
                            {grade.grade_type === 'interro' ? 'Interrogation' : grade.grade_type === 'devoir' ? 'Devoir' : 'Examen'}
                          </span>
                        </td>
                        <td style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>{grade.score}/{grade.max_score}</td>
                        <td style={{ padding: 12, fontSize: 13, color: '#6b7280' }}>{grade.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "bulletin" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>📊 Bulletin trimestriel</h3>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>Générez et visualisez les bulletins des élèves.</p>
          <div style={{ background: '#f0fdf4', padding: 24, borderRadius: 12, border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <p style={{ color: '#166534', fontWeight: 500 }}>📄 Module Bulletin</p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Sélectionnez une classe et générez les bulletins.</p>
          </div>
        </div>
      )}

      {activeTab === "semester" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>📋 Semestre (Secondaire)</h3>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>Gestion des notes semestrielles.</p>
          <div style={{ background: '#eff6ff', padding: 24, borderRadius: 12, border: '1px solid #bfdbfe', textAlign: 'center' }}>
            <p style={{ color: '#1e40af', fontWeight: 500 }}>🔄 Module Semestre</p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Pour le système secondaire avec semestres S1 et S2.</p>
          </div>
        </div>
      )}

      {activeTab === "summary" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>🏆 Classement</h3>
          <p style={{ color: '#6b7280', marginBottom: 20 }}>Classement des élèves par performance.</p>
          <div style={{ background: '#fef3c7', padding: 24, borderRadius: 12, border: '1px solid #fde68a', textAlign: 'center' }}>
            <p style={{ color: '#92400e', fontWeight: 500 }}>🏅 Module Classement</p>
            <p style={{ color: '#6b7280', fontSize: 14 }}>Vue d'ensemble des performances.</p>
          </div>
        </div>
      )}

      {activeTab === "config" && (
        <div>
          <h3 style={{ marginBottom: 16 }}>⚙️ Configuration des notes</h3>
          <div style={{ background: '#f9fafb', padding: 24, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
            <p style={{ color: '#6b7280', marginBottom: 20 }}>
              Configurez les pondérations pour le calcul des moyennes et les seuils de décision. 
              Ces paramètres s'appliquent à toutes les classes de votre école.
            </p>
            
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#374151' }}>📐 Pondérations des notes</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Interrogation (%)</label>
                  <input type="number" min="0" max="100" defaultValue={50} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Devoir (%)</label>
                  <input type="number" min="0" max="100" defaultValue={50} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500 }}>Examen (%)</label>
                  <input type="number" min="0" max="100" defaultValue={0} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: '#374151' }}>🎯 Seuils de décision</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#059669' }}>Réussi (%)</label>
                  <input type="number" min="0" max="100" defaultValue={50} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #10b981' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Minimum pour réussir</span>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#d97706' }}>Repêchage (%)</label>
                  <input type="number" min="0" max="100" defaultValue={45} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #f59e0b' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>45-49% : Examen de rattrapage</span>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 4, fontSize: 14, fontWeight: 500, color: '#dc2626' }}>Double (%)</label>
                  <input type="number" min="0" max="100" defaultValue={55} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ef4444' }} />
                  <span style={{ fontSize: 12, color: '#6b7280' }}>Minimum pour passer (certaines écoles)</span>
                </div>
              </div>
            </div>

            <button 
              onClick={handleSaveGradeConfig}
              disabled={savingConfig}
              style={{ 
                padding: '12px 24px', 
                background: savingConfig ? '#9ca3af' : '#10b981', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                cursor: savingConfig ? 'not-allowed' : 'pointer', 
                fontWeight: 600,
                fontSize: 14
              }}
            >
              {savingConfig ? '⏳ Enregistrement...' : '💾 Enregistrer la configuration'}
            </button>
          </div>

          <div style={{ background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>ℹ️ Information</h4>
            <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>
              Les paramètres de l'école sont configurés par l'administrateur scolaire. 
              Les enseignants peuvent consulter ces paramètres mais ne peuvent pas les modifier.
              Pour changer les pondérations ou les seuils, contactez votre SCHOOL_ADMIN.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
