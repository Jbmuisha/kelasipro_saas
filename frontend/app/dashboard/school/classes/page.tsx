"use client";

import React, { useEffect, useState, useCallback } from "react";
import { FaPlus, FaSearch, FaTimes, FaPen, FaTrash, FaCheck } from "react-icons/fa";
import { apiGet, apiPost, apiFetch } from "@/utils/api";
import "@/app/dashboard/school/classes.css";

interface Class {
  id: number;
  name: string;
  level?: string;
  main_teacher_id?: number;
  main_teacher_name?: string;
  created_at?: string;
}

interface TeacherOption {
  id: number;
  name: string;
}

const LEVELS = [
  { key: "maternelle", label: "Maternelle", icon: <i className="fa fa-child"></i>, classes: ["1ere maternelle", "2eme maternelle", "3eme maternelle"] },
  { key: "primaire", label: "Primaire", icon: <i className="fa fa-book"></i>, classes: ["1ere primaire", "2eme primaire", "3eme primaire", "4eme primaire", "5eme primaire", "6eme primaire"] },
  { key: "secondaire", label: "Secondaire", icon: <i className="fa fa-graduation-cap"></i>, classes: ["7eme secondaire", "8eme secondaire", "1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire"] },
];

export default function ClassesPage() {
  const [activeType, setActiveType] = useState("primaire");
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [userAdminLevel, setUserAdminLevel] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedBaseClass, setSelectedBaseClass] = useState("");
  const [classSuffix, setClassSuffix] = useState("");
  const [secondaryOption, setSecondaryOption] = useState("");
  const [customSecondaryOption, setCustomSecondaryOption] = useState("");
  const [creating, setCreating] = useState(false);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherByClass, setSelectedTeacherByClass] = useState<Record<number, string>>({});
  const [assigningByClass, setAssigningByClass] = useState<Record<number, boolean>>({});
  
  // Class edit/delete state
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [deletingClassId, setDeletingClassId] = useState<number | null>(null);
  
  const handleEditClass = (cls: Class) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
  };
  
  const handleSaveClassEdit = async () => {
    if (!editingClass || !editClassName.trim()) return;
    try {
      await apiFetch(`/api/classes/${editingClass.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editClassName.trim() }),
      });
      fetchClasses(activeType);
      setEditingClass(null);
    } catch (err) {
      console.error('Error updating class:', err);
    }
  };

  const handleDeleteClass = async (cls: Class) => {
    if (!confirm(`Supprimer la classe "${cls.name}" ?`)) return;
    if (!cls.id) {
      alert('ID de classe manquant. Rafraîchissez la page.');
      return;
    }
    console.log('[DELETE] cls:', cls);
    console.log('[DELETE] cls.id:', cls.id, 'typeof:', typeof cls.id);
    const classId = Number(cls.id);
    console.log('[DELETE] Parsed classId:', classId);
    if (isNaN(classId) || classId <= 0) {
      alert('ID de classe invalide: ' + cls.id + ' (parsed: ' + classId + ')');
      return;
    }
    setDeletingClassId(classId);
    console.log('[DELETE] Making DELETE request to /api/classes/' + classId);
    try {
      await apiFetch(`/api/classes/${classId}`, { method: 'DELETE' });
      fetchClasses(activeType);
    } catch (err: any) {
      console.error('Erreur lors de la suppression:', err);
      alert('Erreur lors de la suppression de la classe.');
    } finally {
      setDeletingClassId(null);
    }
  };
  


  useEffect(() => {
    if (typeof window !== 'undefined') {
      const id = parseInt(localStorage.getItem("school_id") || "0");
      setSchoolId(id);
      const u = localStorage.getItem("user");
      if (u) {
        try {
          const user = JSON.parse(u);
          setUserAdminLevel(user?.admin_level || user?.school_type || null);
        } catch {}
      }
    }
  }, []);

  const fetchClasses = useCallback(async (level: string) => {
    if (!schoolId) return;
    
    // Skip fetch if user doesn't have access to this level
    if (userAdminLevel) {
      const myLevel = userAdminLevel.toLowerCase();
      const targetLevel = level.toLowerCase();
      const isMixed = myLevel === "mixed" || myLevel === "mixte";
      const hasAccess = isMixed || 
        (myLevel === "primaire" && targetLevel === "primaire") ||
        (myLevel === "maternelle" && targetLevel === "maternelle") ||
        (myLevel === "secondaire" && targetLevel === "secondaire");
      
      if (!hasAccess) {
        setClasses([]);
        setLoading(false);
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ school_id: schoolId.toString(), level });
      const data = await apiGet(`/classes?${params}`);
      const fetchedClasses = data.classes || [];
      setClasses(fetchedClasses);
      
      // Initialize selectedTeacherByClass with existing assignments
      const initialSelection: Record<number, string> = {};
      fetchedClasses.forEach((cls: any) => {
        if (cls.main_teacher_id) {
          initialSelection[cls.id] = String(cls.main_teacher_id);
        }
      });
      setSelectedTeacherByClass(initialSelection);
      if (data.debug?.count === 0) {
        setError(`No ${level} classes. Create first!`);
      }
    } catch (err: any) {
      console.error("Classes fetch failed:", err);
      setError("Failed to load classes");
    } finally {
      setLoading(false);
    }
  }, [schoolId, userAdminLevel]);

  const fetchTeachers = useCallback(async () => {
    if (!schoolId) return;
    try {
      const data = await apiGet(`/teachers?school_id=${schoolId}`);
      const list: TeacherOption[] = (data.teachers || [])
        .filter((u: any) => u.role === "TEACHER")
        .map((u: any) => ({ id: Number(u.id), name: String(u.name || `Teacher #${u.id}`) }));
      setTeachers(list);
    } catch (err) {
      console.error("Teachers fetch failed:", err);
    }
  }, [schoolId]);

  useEffect(() => {
    // Fetch regardless of userAdminLevel - the fetchClasses function will handle access control
    if (schoolId) {
      fetchClasses(activeType);
      fetchTeachers();
    }
  }, [schoolId, userAdminLevel, activeType, fetchClasses, fetchTeachers]);

  useEffect(() => {
    if (!userAdminLevel || !activeType) return;
    const myLevel = userAdminLevel.toLowerCase();
    const targetLevel = activeType.toLowerCase();

    // For MIXED schools (mixed/mixte) → all levels allowed
    if (myLevel === "mixed" || myLevel === "mixte") {
      setAccessDenied(null);
      return;
    }

    // For single-level admins → verify they access only their level
    const allowed =
      (myLevel === "primaire" && targetLevel === "primaire") ||
      (myLevel === "maternelle" && targetLevel === "maternelle") ||
      (myLevel === "secondaire" && targetLevel === "secondaire");

    if (!allowed) {
      setAccessDenied(`⛔ Access denied. You are assigned to manage ${myLevel.charAt(0).toUpperCase() + myLevel.slice(1)} only.`);
    } else {
      setAccessDenied(null);
    }
  }, [userAdminLevel, activeType]);

  const filteredClasses = classes.filter(cls => cls.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentLevel = LEVELS.find(l => l.key === activeType)!;
  const requiresSecondaryOption =
    activeType === "secondaire" &&
    ["1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire"].includes(selectedBaseClass);
  
  // Load secondary options from localStorage or use defaults
  const [secondaryOptions, setSecondaryOptions] = useState<string[]>([
    "Littéraire", "Pédagogie", "Physique", "Scientifique", "Commerciale", "Autre..."
  ]);
  const [showManageOptions, setShowManageOptions] = useState(false);
  const [editingOption, setEditingOption] = useState<string | null>(null);
  const [newOptionName, setNewOptionName] = useState('');
  
  useEffect(() => {
    const saved = localStorage.getItem('secondaryOptions');
    if (saved) {
      try {
        setSecondaryOptions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  // Save custom option to list - only add complete strings (min 3 chars, no single letters)
  const handleCustomOptionChange = (value: string) => {
    setCustomSecondaryOption(value);
  };
  
  const addOptionToList = () => {
    const opt = customSecondaryOption.trim();
    // Only add if not empty and not already in list
    if (opt && !secondaryOptions.includes(opt)) {
      const updated = [...secondaryOptions.filter(o => o !== 'Autre...'), opt, 'Autre...'];
      setSecondaryOptions(updated);
      localStorage.setItem('secondaryOptions', JSON.stringify(updated));
      setSecondaryOption(opt);
      setCustomSecondaryOption('');
    }
  };
  
  const handleEditOption = (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = secondaryOptions.map(o => o === oldName ? newName.trim() : o);
    setSecondaryOptions(updated);
    localStorage.setItem('secondaryOptions', JSON.stringify(updated));
    setEditingOption(null);
    setNewOptionName('');
  };
  
  const handleDeleteOption = (name: string) => {
    if (!confirm(`Supprimer "${name}" de la liste?`)) return;
    const updated = secondaryOptions.filter(o => o !== name);
    setSecondaryOptions(updated);
    localStorage.setItem('secondaryOptions', JSON.stringify(updated));
  };
  
  const effectiveSecondaryOption = secondaryOption === "Autre..."
    ? customSecondaryOption.trim()
    : secondaryOption;

  const handleCreate = async () => {
    if (!selectedBaseClass || !classSuffix || !schoolId) return;
    if (requiresSecondaryOption && !effectiveSecondaryOption) {
      alert("Choisissez l'option pour cette classe secondaire");
      return;
    }

    const fullName = requiresSecondaryOption
      ? `${selectedBaseClass} ${effectiveSecondaryOption} ${classSuffix}`
      : `${selectedBaseClass} ${classSuffix}`;
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
      setSecondaryOption('');
      setCustomSecondaryOption('');
      fetchClasses(activeType);
    } catch (err: any) {
      console.error("Class create failed:", err);
      alert(`Create failed: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignPrincipal = async (classId: number) => {
    const teacherId = selectedTeacherByClass[classId];
    if (!teacherId) {
      alert("Select a teacher first");
      return;
    }

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') || '{}' : '{}';
    const user = JSON.parse(userStr);
    if (!user?.id) {
      alert("Missing current user");
      return;
    }

    setAssigningByClass((prev) => ({ ...prev, [classId]: true }));
    try {
      await apiPost(`/classes/${classId}/assign-teacher`, {
        teacher_id: Number(teacherId),
        created_by: Number(user.id),
      });
      await fetchClasses(activeType);
    } catch (err: any) {
      console.error("Assign principal failed:", err);
      alert(`Assign failed: ${err.message}`);
    } finally {
      setAssigningByClass((prev) => ({ ...prev, [classId]: false }));
    }
  };

  if (!schoolId) {
    return <div className="loading">Loading school info...</div>;
  }

  return (
    <div className="classes-page">
      {accessDenied && (
        <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#991b1b", padding: 16, borderRadius: 8, marginBottom: 16, textAlign: "center", fontWeight: 600 }}>
          {accessDenied}
        </div>
      )}
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
          {!accessDenied ? (
            <>
              <p>Select a base class and suffix (A, B...) to create.</p>
              <button onClick={() => setShowCreateModal(true)} className="btn-primary">Create First Class</button>
            </>
          ) : (
            <p>You don't have access to this section.</p>
          )}
        </div>
      ) : (
        <div className="classes-grid">
          {filteredClasses.map(cls => (
            <div key={cls.id} className="class-card">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>{cls.name}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  <button 
                    onClick={() => handleEditClass(cls)} 
                    style={{ padding: '4px 8px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    title="Modifier le nom"
                  ><FaPen /></button>
                  <button 
                    onClick={() => handleDeleteClass(cls)} 
                    disabled={deletingClassId === cls.id}
                    style={{ padding: '4px 8px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
                    title="Supprimer la classe"
                  >{deletingClassId === cls.id ? '...' : <FaTrash />}</button>
                </div>
                {(cls.main_teacher_name || selectedTeacherByClass[cls.id]) && (
                  <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 500, marginLeft: 'auto' }}>
                    <i className="fa fa-user" style={{ marginRight: '4px' }}></i>
                    {selectedTeacherByClass[cls.id] ? teachers.find(t => t.id === Number(selectedTeacherByClass[cls.id]))?.name || '...' : cls.main_teacher_name}
                  </span>
                )}
              </h3>
              {!cls.main_teacher_name && (
                <p style={{ color: '#9ca3af', fontSize: '13px', marginTop: '-8px', marginBottom: '12px' }}><i className="fa fa-user-plus" style={{marginRight:'4px'}}></i>No teacher assigned</p>
              )}
              <div className="card-actions">
                <select
                  value={selectedTeacherByClass[cls.id] || ""}
                  onChange={(e) =>
                    setSelectedTeacherByClass((prev) => ({ ...prev, [cls.id]: e.target.value }))
                  }
                >
                  <option value="">-- Select Teacher --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t.name}</option>
                  ))}
                </select>
                <button
                  className="btn-secondary"
                  onClick={() => handleAssignPrincipal(cls.id)}
                  disabled={!selectedTeacherByClass[cls.id] || !!assigningByClass[cls.id]}
                >
                  {assigningByClass[cls.id] ? "Assigning..." : "Assign Principale"}
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
            {requiresSecondaryOption && (
              <div className="form-group">
                <label>Option (1ère à 4ème secondaire) *</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <select
                    value={secondaryOption}
                    onChange={(e) => {
                      setSecondaryOption(e.target.value);
                      if (e.target.value !== "Autre...") setCustomSecondaryOption("");
                    }}
                    className="full-width"
                  >
                    <option value="">Sélectionner une option</option>
                    {secondaryOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowManageOptions(true)} style={{ padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>⚙️ Gérer</button>
                </div>
                {secondaryOption === "Autre..." && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <input
                      type="text"
                      value={customSecondaryOption}
                      onChange={(e) => handleCustomOptionChange(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addOptionToList()}
                      placeholder="Nouvelle option"
                      className="full-width"
                    />
                    <button type="button" onClick={addOptionToList} disabled={!customSecondaryOption.trim()} style={{ padding: '6px 12px', background: customSecondaryOption.trim() ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: 4, cursor: customSecondaryOption.trim() ? 'pointer' : 'not-allowed' }}>+ Ajouter</button>
                  </div>
                )}
              </div>
            )}
            <small>
              {requiresSecondaryOption
                ? 'Exemple: "2eme secondaire" + "Pédagogie" + "A" = "2eme secondaire Pédagogie A"'
                : 'Example: "7eme secondaire" + "A" = "7eme secondaire A"'}
            </small>
            <div className="form-actions">
              <button className="btn-cancel" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-save" 
                onClick={handleCreate}
                disabled={!selectedBaseClass || !classSuffix || (requiresSecondaryOption && !effectiveSecondaryOption) || creating}
              >
                {creating ? '⏳' : <FaPlus />}
                {creating ? "Creating..." : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Options Management Modal */}
      {showManageOptions && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Gérer les options</h2>
              <button className="modal-close" onClick={() => setShowManageOptions(false)}>×</button>
            </div>
            <div style={{ padding: '16px', maxHeight: 400, overflowY: 'auto' }}>
              <p style={{ marginBottom: 16, color: '#666' }}>Modifiez ou supprimez les options disponibles.</p>
              
              {/* List of options with edit/delete */}
              <div style={{ marginBottom: 20 }}>
                {secondaryOptions.filter(o => o !== 'Autre...').map((name, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
                    {editingOption === name ? (
                      <>
                        <input
                          type="text"
                          value={newOptionName}
                          onChange={e => setNewOptionName(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }}
                          autoFocus
                        />
                        <button onClick={() => handleEditOption(name, newOptionName)} style={{ padding: '4px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaCheck /></button>
                        <button onClick={() => { setEditingOption(null); setNewOptionName(''); }} style={{ padding: '4px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaTimes /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontWeight: 500 }}>{name}</span>
                        <button onClick={() => { setEditingOption(name); setNewOptionName(name); }} style={{ padding: '4px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaPen /></button>
                        <button onClick={() => handleDeleteOption(name)} style={{ padding: '4px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaTrash /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new option */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newOptionName}
                  onChange={e => setNewOptionName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newOptionName.trim() && !secondaryOptions.includes(newOptionName.trim())) {
                      handleEditOption('', newOptionName);
                    }
                  }}
                  placeholder="Nouvelle option"
                  style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}
                />
                <button 
                  onClick={() => {
                    if (newOptionName.trim() && !secondaryOptions.includes(newOptionName.trim())) {
                      const updated = [...secondaryOptions, newOptionName.trim()];
                      setSecondaryOptions(updated);
                      localStorage.setItem('secondaryOptions', JSON.stringify(updated));
                      setNewOptionName('');
                    }
                  }} 
                  disabled={!newOptionName.trim() || secondaryOptions.includes(newOptionName.trim())}
                  style={{ padding: '8px 16px', background: newOptionName.trim() ? '#28a745' : '#ccc', color: '#fff', border: 'none', borderRadius: 4, cursor: newOptionName.trim() ? 'pointer' : 'not-allowed' }}
                >+ Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {editingClass && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>Edit Class</h2>
              <button className="modal-close" onClick={() => setEditingClass(null)}>×</button>
            </div>
            <div style={{ padding: '16px' }}>
              <div className="form-group">
                <label>Class Name</label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="full-width"
                  autoFocus
                />
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setEditingClass(null)}>Cancel</button>
                <button className="btn-save" onClick={handleSaveClassEdit}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
