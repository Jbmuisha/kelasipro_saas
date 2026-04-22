"use client";

import { useEffect, useState } from "react";
import { FaPen, FaTrash, FaCheck, FaTimes } from "react-icons/fa";
import "./classes.css";

const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ClassData = {
  id: string;
  name: string;
  school_id: string;
  createdAt: string;
};

type TeacherOption = { id: number; name: string; email?: string };

export default function SecretaryClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [className, setClassName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schoolType, setSchoolType] = useState<string | null>(null);
  const [allowedClassNames, setAllowedClassNames] = useState<string[]>([]);
  const [customClassName, setCustomClassName] = useState('');
  const [showManageNames, setShowManageNames] = useState(false);
  const [editingClassName, setEditingClassName] = useState<string | null>(null);
  const [newClassName, setNewClassName] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // teacher assignment
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherByClass, setSelectedTeacherByClass] = useState<Record<string, string>>({});
  const [assigningByClass, setAssigningByClass] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  useEffect(() => {
    // when currentUser changes, fetch school_type to determine allowed class names
    const fetchSchoolType = async () => {
      if (!currentUser?.school_id) return;
      try {
        const res = await fetch(`${API_URL}/api/schools/${currentUser.school_id}`);
        if (!res.ok) return;
        const data = await res.json();
        const st = data.school_type || 'primaire';
        setSchoolType(st);
        
        // Load custom class names from localStorage or use defaults
        const storageKey = `classNames_${st}`;
        const savedNames = localStorage.getItem(storageKey);
        
        if (savedNames) {
          setAllowedClassNames(JSON.parse(savedNames));
        } else {
          // Default names based on school type
          if (st && st.toLowerCase().includes('primaire')) {
            const primaire = [
              "1ere primaire", "2eme primaire", "3eme primaire",
              "4eme primaire", "5eme primaire", "6eme primaire",
            ];
            setAllowedClassNames(primaire);
            localStorage.setItem(storageKey, JSON.stringify(primaire));
          } else if (st && st.toLowerCase().includes('second')) {
            const secondaire = [
              "1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire",
            ];
            setAllowedClassNames(secondaire);
            localStorage.setItem(storageKey, JSON.stringify(secondaire));
          } else if (st && st.toLowerCase().includes('maternelle')) {
            const maternelle = [
              "1ere maternelle", "2eme maternelle", "3eme maternelle",
            ];
            setAllowedClassNames(maternelle);
            localStorage.setItem(storageKey, JSON.stringify(maternelle));
          } else {
            setAllowedClassNames([]);
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchSchoolType();
  }, [currentUser]);

  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // Save class names to localStorage
  const saveClassNames = (names: string[]) => {
    setAllowedClassNames(names);
    const storageKey = `classNames_${schoolType}`;
    localStorage.setItem(storageKey, JSON.stringify(names));
  };

  // Add new class name
  const handleAddClassName = () => {
    if (!newClassName.trim()) return;
    const updated = [...allowedClassNames, newClassName.trim()];
    saveClassNames(updated);
    setNewClassName('');
    showToast('Classe ajoutée!', 'success');
  };

  // Edit class name
  const handleEditClassName = (oldName: string, newName: string) => {
    if (!newName.trim()) return;
    const updated = allowedClassNames.map(n => n === oldName ? newName.trim() : n);
    saveClassNames(updated);
    setEditingClassName(null);
    showToast('Classe modifiée!', 'success');
  };

  // Delete class name
  const handleDeleteClassName = (name: string) => {
    if (!confirm(`Supprimer "${name}" de la liste?`)) return;
    const updated = allowedClassNames.filter(n => n !== name);
    saveClassNames(updated);
    showToast('Classe supprimée!', 'success');
  };

  const fetchClasses = async () => {
    if (!currentUser?.school_id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }
      const data = await response.json();
      setClasses(data.classes || []);
    } catch (err) {
      console.error(err);
      setError("Could not load classes.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    if (!currentUser?.school_id) return;
    try {
      const token = localStorage.getItem('token');
      const url = `${API_URL}/api/teachers?school_id=${currentUser.school_id}`;
      console.debug('[classes] fetchTeachers', { url, hasToken: !!token, school_id: currentUser.school_id });

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token || ''}` }
      });
      const data = await res.json().catch(() => ({}));
      console.debug('[classes] teachers response', { status: res.status, data });

      if (!res.ok) throw new Error(data.error || data.message || 'Failed to fetch teachers');
      const list = (data.teachers || []).filter((u: any) => u.role === 'TEACHER');
      setTeachers(list);

      if (list.length === 0) {
        showToast('No teachers found for this school yet', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to fetch teachers', 'error');
    }
  };

  const assignTeacherToClass = async (classId: string) => {
    const teacherId = selectedTeacherByClass[classId];
    if (!teacherId) {
      showToast('Select a teacher first', 'error');
      return;
    }
    if (!currentUser?.id) {
      showToast('Missing current user', 'error');
      return;
    }

    setAssigningByClass(prev => ({ ...prev, [classId]: true }));
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/classes/${classId}/assign-teacher`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
        body: JSON.stringify({ teacher_id: Number(teacherId), created_by: Number(currentUser.id) })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || body.message || 'Failed to assign teacher');
      }
      showToast(body.message || 'Teacher assigned', 'success');
      // refresh classes list (and any teacher/classes enrichment if backend adds it later)
      fetchClasses();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Error assigning teacher', 'error');
    } finally {
      setAssigningByClass(prev => ({ ...prev, [classId]: false }));
    }
  };

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchClasses();
      fetchTeachers();
    }
  }, [currentUser]);

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/classes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: Number(currentUser.school_id),
          name: className,
          created_by: currentUser?.id || null
        })
      });
      if (!response.ok) {
        const body = await response.json().catch(()=>({}));
        const msg = body.error || body.message || 'Failed to create class';
        throw new Error(msg);
      }
      fetchClasses();
      setShowModal(false);
      setClassName("");
      showToast("Class created successfully!");
    } catch (err:any) {
      console.error(err);
      showToast(err.message || "Error creating class", "error");
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Classes Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={() => setShowModal(true)}>
            + Add Class
          </button>
          <button className="btn-test" onClick={async () => {
            // create a test class using currentUser
            const userStr = localStorage.getItem('user');
            if (!userStr) { showToast('No user in localStorage', 'error'); return; }
            const user = JSON.parse(userStr);
            if (!user.id || !user.school_id) { showToast('Invalid user in localStorage', 'error'); return; }
            const token = localStorage.getItem('token');
            // choose safe base name depending on schoolType
            const st = schoolType || 'primaire';
            const base = st.toLowerCase().includes('second') ? '1ere secondaire' : '1ere primaire';
            const testName = `${base} A`;
            try {
              const res = await fetch(`${API_URL}/api/classes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ school_id: Number(user.school_id), name: testName, created_by: user.id })
              });
              const body = await res.json().catch(()=>({}));
              if (!res.ok) {
                showToast(body.error || body.message || 'Failed to create test class', 'error');
              } else {
                showToast('Test class created: '+testName, 'success');
                fetchClasses();
              }
            } catch (err:any) {
              console.error(err);
              showToast(err.message || 'Error', 'error');
            }
          }}>Create test class</button>
          <button className="btn-bulk" onClick={async () => {
            const userStr = localStorage.getItem('user');
            if (!userStr) { showToast('No user in localStorage', 'error'); return; }
            const user = JSON.parse(userStr);
            if (!user.id || !user.school_id) { showToast('Invalid user in localStorage', 'error'); return; }
            const token = localStorage.getItem('token');
            const st = schoolType || 'primaire';
            const base = st.toLowerCase().includes('second') ? '1ere secondaire' : '1ere primaire';
            const letters = ['A','B','C','D','E','F'];
            try{
              for(const l of letters){
                const name = `${base} ${l}`;
                const res = await fetch(`${API_URL}/api/classes/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ school_id: Number(user.school_id), name, created_by: user.id }) });
                const body = await res.json().catch(()=>({}));
                if (!res.ok){ console.warn('Bulk create failed for', name, body); }
              }
              showToast('Bulk classes created (A-F)', 'success');
              fetchClasses();
            }catch(err:any){ console.error(err); showToast('Bulk create error','error'); }
          }}>Create A-F sections</button>
        </div>
      </div>

      {error && <p className="no-data">{error}</p>}
      {loading && <p className="loading">Loading classes...</p>}

      {!loading && classes.length > 0 && (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Class Name</th>
                <th>Created At</th>
                <th>Assign Teacher</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td>{cls.id}</td>
                  <td>{cls.name}</td>
                  <td>{cls.createdAt ? new Date(cls.createdAt).toLocaleString() : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <select
                        value={selectedTeacherByClass[cls.id] || ''}
                        onChange={(e) => setSelectedTeacherByClass(prev => ({ ...prev, [cls.id]: e.target.value }))}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map(t => (
                          <option key={t.id} value={String(t.id)}>
                            {t.name}{t.email ? ` (${t.email})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => assignTeacherToClass(cls.id)}
                        disabled={!!assigningByClass[cls.id]}
                      >
                        {assigningByClass[cls.id] ? 'Assigning...' : 'Assign'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && classes.length === 0 && (
        <p className="no-data">No classes found.</p>
      )}

      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Class</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="user-form">
              <div className="form-group">
                <label>Class Name</label>
                {allowedClassNames && allowedClassNames.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <select value={selectedClassName || ''} onChange={(e)=>{
                        const v = e.target.value;
                        setSelectedClassName(v);
                        if(v !== 'OTHER') setClassName(v);
                      }}>
                        <option value="">Select class</option>
                        {allowedClassNames.map(n => <option key={n} value={n}>{n}</option>)}
                        <option value="OTHER">Other (custom)</option>
                      </select>
                      <button type="button" onClick={() => setShowManageNames(true)} style={{ padding: '6px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>⚙️ Gérer</button>
                    </div>
                    {selectedClassName === 'OTHER' && (
                      <input type="text" value={className} onChange={e=>setClassName(e.target.value)} placeholder="Custom class name" />
                    )}

                    {/* Section picker: alphabet A-Z */}
                    {selectedClassName && selectedClassName !== 'OTHER' && (
                      <div style={{ marginTop: 8 }}>
                        <label>Section</label>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                          {Array.from({ length: 26 }).map((_, i) => {
                            const letter = String.fromCharCode(65 + i); // A..Z
                            return (
                              <button
                                key={letter}
                                type="button"
                                onClick={() => { setSelectedSection(letter); setClassName(`${selectedClassName} ${letter}`); }}
                                style={{ padding: '4px 8px', background: selectedSection===letter ? '#ddd' : '#fff', border: '1px solid #ccc', borderRadius: 4 }}
                              >{letter}</button>
                            )
                          })}
                          <button type="button" onClick={()=>{ setSelectedSection('OTHER'); setClassName(''); }} style={{ padding: '4px 8px' }}>Other</button>
                        </div>
                        {selectedSection === 'OTHER' && (
                          <input style={{ marginTop: 8 }} type="text" value={className} onChange={e=>setClassName(e.target.value)} placeholder="Custom section" />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="e.g. 1st Grade, Math 101"
                  />
                )}
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-save" onClick={handleCreateClass}>Create Class</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Names Management Modal */}
      {showManageNames && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h2>Gérer les noms de classes</h2>
              <button className="modal-close" onClick={() => setShowManageNames(false)}>×</button>
            </div>
            <div style={{ padding: '16px', maxHeight: 400, overflowY: 'auto' }}>
              <p style={{ marginBottom: 16, color: '#666' }}>Modifiez ou supprimez les noms de classes disponibles pour ce type d'école.</p>
              
              {/* List of class names with edit/delete */}
              <div style={{ marginBottom: 20 }}>
                {allowedClassNames.map((name, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '8px', background: '#f5f5f5', borderRadius: 4 }}>
                    {editingClassName === name ? (
                      <>
                        <input
                          type="text"
                          value={newClassName}
                          onChange={e => setNewClassName(e.target.value)}
                          style={{ flex: 1, padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }}
                          autoFocus
                        />
                        <button onClick={() => handleEditClassName(name, newClassName)} style={{ padding: '4px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaCheck /></button>
                        <button onClick={() => { setEditingClassName(null); setNewClassName(''); }} style={{ padding: '4px 12px', background: '#6c757d', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaTimes /></button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontWeight: 500 }}>{name}</span>
                        <button onClick={() => { setEditingClassName(name); setNewClassName(name); }} style={{ padding: '4px 12px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaPen /></button>
                        <button onClick={() => handleDeleteClassName(name)} style={{ padding: '4px 12px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}><FaTrash /></button>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new class name */}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddClassName()}
                  placeholder="Nouvelle classe (ex: 5ème secondaire)"
                  style={{ flex: 1, padding: '8px', border: '1px solid #ccc', borderRadius: 4 }}
                />
                <button onClick={handleAddClassName} style={{ padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>+ Ajouter</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
