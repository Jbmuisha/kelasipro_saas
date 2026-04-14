"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FaPlus, FaEdit, FaSpinner, FaSearch, FaTimes } from "react-icons/fa";
import { apiGet, apiPost } from "@/utils/api";
import "@/app/dashboard/school/classes.css";

interface Class {
  id: number;
  name: string;
  level?: string;
  main_teacher_id?: number;
  main_teacher_name?: string;
  created_at?: string;
}

const LEVELS = [
  { key: "maternelle", label: "Maternelle", icon: "👶", classes: ["1ere maternelle", "2eme maternelle", "3eme maternelle"] },
  { key: "primaire", label: "Primaire", icon: "📚", classes: ["1ere primaire", "2eme primaire", "3eme primaire", "4eme primaire", "5eme primaire", "6eme primaire"] },
  { key: "secondaire", label: "Secondaire", icon: "🎓", classes: ["7eme secondaire", "8eme secondaire", "1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire"] },
];

export default function ClassesPage() {
  const [activeType, setActiveType] = useState("primaire");
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBaseClass, setSelectedBaseClass] = useState("");
  const [classSuffix, setClassSuffix] = useState("");
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = parseInt(localStorage.getItem("school_id") || "0");
      setSchoolId(id);
    }
  }, []);

  const fetchClasses = useCallback(async (level: string) => {
    if (!schoolId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ school_id: schoolId.toString(), level });
      const data = await apiGet(`/classes?${params}`);
      const fetchedClasses = data.classes || [];
      setClasses(fetchedClasses);
      if (data.debug?.count === 0) {
        setError(`No ${level} classes. Create first!`);
      }
    } catch (err: any) {
      console.error("Classes fetch failed:", err);
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    if (schoolId) {
      fetchClasses(activeType);
    }
  }, [schoolId, activeType, fetchClasses]);

  const filteredClasses = classes.filter(cls => cls.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentLevel = LEVELS.find(l => l.key === activeType)!;

  const handleCreate = async () => {
    if (!selectedBaseClass || !classSuffix || !schoolId) return;
    
    const fullName = `${selectedBaseClass} ${classSuffix}`;
    setCreating(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') || '{}' : '{}';
      const user = JSON.parse(userStr);
      await apiPost('/classes', {
        school_id: schoolId,
        name: fullName,
        level: activeType,
        created_by: user.id
      });
      setShowCreateModal(false);
      setSelectedBaseClass('');
      setClassSuffix('');
      fetchClasses(activeType);
    } catch (err: any) {
      console.error("Class create failed:", err);
      alert(`Create failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  if (!schoolId) {
    return <div className="loading">Loading school info...</div>;
  }

  return (
    <div className="classes-page">
      <div className="page-header">
        <h1>{currentLevel.icon} Classes - {currentLevel.label}</h1>
        <div className="header-actions">
          <div className="search-container">
            <FaSearch />
            <input 
              placeholder="Search classes..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">
            <FaPlus /> New Class
          </button>
        </div>
      </div>

      <div className="level-tabs">
        {LEVELS.map(level => (
          <button 
            key={level.key} 
            className={`tab ${activeType === level.key ? "active" : ""}`} 
            onClick={() => setActiveType(level.key)}
          >
            {level.icon} {level.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">⏳ Loading classes...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : filteredClasses.length === 0 ? (
        <div className="classes-empty">
          <h3>No classes yet</h3>
          <p>Select a base class and suffix (A, B...) to create.</p>
          <button onClick={() => setShowCreateModal(true)} className="btn-primary">Create First Class</button>
        </div>
      ) : (
        <div className="classes-grid">
          {filteredClasses.map(cls => (
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

      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Create {currentLevel.label} Class</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <FaTimes />
              </button>
            </div>
            <div className="form-group">
              <label>Base Class *</label>
              <select
                value={selectedBaseClass}
                onChange={(e) => setSelectedBaseClass(e.target.value)}
                className="full-width"
              >
                <option value="">Select base class</option>
                {currentLevel.classes.map((baseName) => (
                  <option key={baseName} value={baseName}>{baseName}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Suffix (A, B, C...) *</label>
              <input
                type="text"
                value={classSuffix}
                onChange={(e) => setClassSuffix(e.target.value.toUpperCase())}
                placeholder="A, B, C..."
                maxLength={2}
              />
            </div>
            <small>Example: "7eme secondaire" + "A" = "7eme secondaire A"</small>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={handleCreate}
                disabled={!selectedBaseClass || !classSuffix || creating}
              >
                {creating ? '⏳' : <FaPlus />}
                {creating ? "Creating..." : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

