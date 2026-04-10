"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaEdit, FaSpinner, FaSearch } from "react-icons/fa";
import { getApiBase } from "@/utils/apiBase";

interface Class {
  id: number;
  name: string;
  level?: string;
  main_teacher_id?: number;
  main_teacher_name?: string;
  created_at?: string;
}

interface ApiResponse {
  classes: Class[];
  debug?: {
    school_id: number;
    level: string;
    count: number;
    db?: string;
    requester_type?: string | null;
  };
}

const LEVELS = [
  { key: "maternelle", label: "Maternelle", icon: "👶" },
  { key: "primaire", label: "Primaire", icon: "📚" },
  { key: "secondaire", label: "Secondaire", icon: "🎓" },
];

export default function ClassesPage() {
  const [activeType, setActiveType] = useState< string >("primaire");
  const [classesByType, setClassesByType] = useState<{ [key: string]: Class[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [schoolType, setSchoolType] = useState("primaire");
  const router = useRouter();

  // Load school_id and school_type from localStorage (set by layout/auth)
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    const schoolTypeSaved = localStorage.getItem("school_type") || "primaire";
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setSchoolId(user.school_id || parseInt(localStorage.getItem("school_id") || "0"));
        const lockedType = user.admin_level || schoolTypeSaved;
        setSchoolType(lockedType);
        setActiveType(lockedType);
      } catch {}
    } else {
      setError("User not authenticated. Please log in.");
    }
  }, []);

  const fetchClasses = useCallback(async (level: string) => {
    if (!schoolId) return;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ school_id: schoolId.toString(), level });
      const response = await fetch(`${getApiBase()}/classes?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: ApiResponse = await response.json();

      setClassesByType((prev) => ({ ...prev, [level]: data.classes || [] }));
      
      // Show debug if empty
      if (!data.classes?.length && data.debug) {
        console.log("[DEBUG Classes]", data.debug);
        if (data.debug.count === 0) {
          setError(`No classes found for ${level}. Create your first class! (DB: ${data.debug.db || "unknown"})`);
        }
      }
    } catch (err) {
      setError(`Failed to fetch classes: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchClasses(activeType);
    }
  }, [schoolId, activeType, fetchClasses]);

  const filteredClasses = classesByType[activeType]?.filter((cls) =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleCreateClass = () => {
    // Modal or navigate to create form - for now, alert with allowed names
    const allowed = getAllowedClassNames(schoolType);
    alert(`Create class for ${activeType}:\nAllowed base names: ${allowed.join(", ")}\n(e.g. "1ere primaire A")`);
  };

  const getAllowedClassNames = (type: string): string[] => {
    // Mirror backend logic
    const lists: Record<string, string[]> = {
      maternelle: ["1ere maternelle", "2eme maternelle", "3eme maternelle"],
      primaire: ["1ere primaire", "2eme primaire", "3eme primaire", "4eme primaire", "5eme primaire", "6eme primaire"],
      secondaire: ["7eme secondaire", "8eme secondaire", "1ere secondaire", "2ere secondaire", "3eme secondaire", "4eme secondaire"],
    };
    return lists[type] || [];
  };

  if (!schoolId) {
    return <div className="classes-empty">Loading school info...</div>;
  }

  return (
    <div className="classes-page">
      <div className="page-header">
        <h1>Classes - {LEVELS.find(l => l.key === activeType)?.label}</h1>
        <div className="header-actions">
          <div className="search-container">
            <FaSearch />
            <input
              type="text"
              placeholder="Search classes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={handleCreateClass} className="btn-primary">
            <FaPlus /> New Class
          </button>
        </div>
      </div>

      <div className="level-tabs">
        {LEVELS.map((level) => (
          <button
            key={level.key}
            className={`tab ${activeType === level.key ? "active" : ""}`}
            onClick={() => setActiveType(level.key)}
            disabled={schoolType !== "primaire" && level.key === "maternelle"} // Example restriction
          >
            {level.icon} {level.label}
          </button>
        ))}
      </div>

      {loading ? (
<div className="loading"><span className="spin"><FaSpinner /></span> Loading classes...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredClasses.length === 0 ? (
        <div className="classes-empty">
          <h3>No classes yet</h3>
          <p>Click "New Class" to add your first {activeType} class.</p>
          <p><strong>Allowed names:</strong> {getAllowedClassNames(activeType).join(", ")}</p>
          <button onClick={handleCreateClass} className="btn-primary">Create First Class</button>
        </div>
      ) : (
        <div className="classes-grid">
          {filteredClasses.map((cls) => (
            <div key={cls.id} className="class-card">
              <h3>{cls.name}</h3>
              {cls.main_teacher_name && (
                <p><strong>Main Teacher:</strong> {cls.main_teacher_name}</p>
              )}
              <div className="card-actions">
                <button className="btn-secondary" onClick={() => router.push(`/dashboard/school/classes/${cls.id}`)}>
                  <FaEdit /> Manage
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <style jsx>{`
        .classes-page { padding: 2rem; max-width: 1200px; margin: 0 auto; }
        .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .page-header h1 { margin: 0; font-size: 2rem; }
        .search-container { display: flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 8px; background: white; }
        .search-container input { border: none; outline: none; width: 200px; }
        .btn-primary { background: #4f46e5; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; display: flex; gap: 0.5rem; align-items: center; }
        .btn-primary:hover { background: #3730a3; }
        .btn-secondary { background: #6b7280; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; display: flex; gap: 0.25rem; align-items: center; font-size: 0.875rem; }
        .level-tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }
        .tab { padding: 0.75rem 1.5rem; border: 2px solid #e5e7eb; background: white; border-radius: 12px; cursor: pointer; font-weight: 500; transition: all 0.2s; display: flex; align-items: center; gap: 0.5rem; }
        .tab:hover { border-color: #4f46e5; }
        .tab.active { background: #4f46e5; color: white; border-color: #4f46e5; }
        .tab:disabled { opacity: 0.5; cursor: not-allowed; }
        .loading, .error, .classes-empty { text-align: center; padding: 4rem 2rem; }
        .loading svg { width: 2rem; height: 2rem; animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .error { color: #dc2626; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; }
        .classes-empty { background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; }
        .classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .class-card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); transition: box-shadow 0.2s; }
        .class-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .class-card h3 { margin: 0 0 0.5rem 0; color: #1f2937; }
        .class-card p { margin: 0 0 1rem 0; color: #6b7280; font-size: 0.95rem; }
        .card-actions { display: flex; gap: 0.5rem; }
        @media (max-width: 768px) { .classes-grid { grid-template-columns: 1fr; } .page-header { flex-direction: column; align-items: stretch; } .search-container input { width: 100%; } }
      `}</style>
    </div>
  );
}

