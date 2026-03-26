"use client";

import { useEffect, useState } from "react";
import "../../classes/classes.css";

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
  main_teacher_id?: number;
  main_teacher_name?: string;
};

type TeacherOption = { id: number; name: string; email?: string };

export default function SecondaireClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [className, setClassName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);

  // modal helpers
  const [allowedClassNames] = useState<string[]>([
    "7eme secondaire",
    "8eme secondaire",
    "1ere secondaire",
    "2eme secondaire",
    "3eme secondaire",
    "4eme secondaire",
  ]);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [optionName, setOptionName] = useState("");
  const [selectedSection, setSelectedSection] = useState("");

  // teacher assignment
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [selectedTeacherByClass, setSelectedTeacherByClass] = useState<Record<string, string>>({});
  const [assigningByClass, setAssigningByClass] = useState<Record<string, boolean>>({});

  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const fetchClasses = async () => {
    if (!currentUser?.school_id) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}&level=secondaire`);
      if (!response.ok) throw new Error("Failed to fetch classes");
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
      const token = localStorage.getItem("token");
      const url = `${API_URL}/api/teachers?school_id=${currentUser.school_id}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token || ""}` } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || "Failed to fetch teachers");
      const list = (data.teachers || []).filter((u: any) => u.role === "TEACHER");
      setTeachers(list);
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to fetch teachers", "error");
    }
  };

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchClasses();
      fetchTeachers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const assignTeacherToClass = async (classId: string) => {
    const teacherId = selectedTeacherByClass[classId];
    if (!teacherId) {
      showToast("Select a teacher first", "error");
      return;
    }
    if (!currentUser?.id) {
      showToast("Missing current user", "error");
      return;
    }

    setAssigningByClass((prev) => ({ ...prev, [classId]: true }));
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/classes/${classId}/assign-teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
        body: JSON.stringify({ teacher_id: Number(teacherId), created_by: Number(currentUser.id) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || body.message || "Failed to assign teacher");
      showToast(body.message || "Teacher assigned", "success");
      fetchClasses();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error assigning teacher", "error");
    } finally {
      setAssigningByClass((prev) => ({ ...prev, [classId]: false }));
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/api/classes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: Number(currentUser.school_id),
          name: className,
          level: "secondaire",
          created_by: currentUser?.id || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || "Failed to create class");
      fetchClasses();
      setShowModal(false);
      setClassName("");
      setSelectedClassName("");
      setOptionName("");
      setSelectedSection("");
      showToast("Class created successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error creating class", "error");
    }
  };

  const bulkCreateAF = async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      showToast("No user in localStorage", "error");
      return;
    }
    const user = JSON.parse(userStr);
    if (!user.id || !user.school_id) {
      showToast("Invalid user in localStorage", "error");
      return;
    }
    const token = localStorage.getItem("token");
    const letters = ["A", "B", "C", "D", "E", "F"];
    const bases = ["7eme secondaire", "8eme secondaire", "1ere secondaire", "2eme secondaire", "3eme secondaire", "4eme secondaire"];

    try {
      for (const base of bases) {
        for (const l of letters) {
          const name = `${base} ${l}`;
          const res = await fetch(`${API_URL}/api/classes/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ school_id: Number(user.school_id), name, level: "secondaire", created_by: user.id }),
          });
          await res.json().catch(() => ({}));
        }
      }
      showToast("Bulk secondary classes created (A-F for 7e,8e,1e-4e)", "success");
      fetchClasses();
    } catch (err: any) {
      console.error(err);
      showToast("Bulk create error", "error");
    }
  };

  return (
    <div className="users-page secondary-theme">
      <div className="page-header">
        <h1>Classes (Secondaire)</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={() => setShowModal(true)}>
            + Add Class
          </button>
          <button className="btn-bulk" onClick={bulkCreateAF}>
            Create A-F sections
          </button>
        </div>
      </div>

      {error && <p className="no-data">{error}</p>}
      {loading && <p className="loading">Loading classes...</p>}

      {!loading && classes.length > 0 && (
        <div className="secondary-classes-grid">
          {classes.map((cls) => (
            <div key={cls.id} className="secondary-class-card">
              <div className="secondary-class-top">
                <div className="secondary-class-name">{cls.name}</div>
                <div className="secondary-class-meta">ID: {cls.id}</div>
                {cls.main_teacher_name && (
                  <div style={{ fontSize: 12, color: '#2a7', marginTop: 4 }}>
                    👤 Prof. Principal: <strong>{cls.main_teacher_name}</strong>
                  </div>
                )}
              </div>

              <div className="secondary-class-actions">
                <label style={{ fontSize: 11, color: '#666', marginBottom: 2, display: 'block' }}>Professeur Principal</label>
                <select
                  value={selectedTeacherByClass[cls.id] || ""}
                  onChange={(e) => setSelectedTeacherByClass((prev) => ({ ...prev, [cls.id]: e.target.value }))}
                >
                  <option value="">Choisir le prof principal</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={String(t.id)}>
                      {t.name}{t.email ? ` (${t.email})` : ""}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => assignTeacherToClass(cls.id)} disabled={!!assigningByClass[cls.id]}>
                  {assigningByClass[cls.id] ? "Assigning..." : "Assigner"}
                </button>
              </div>

              <div className="secondary-class-footer">Created: {cls.createdAt ? new Date(cls.createdAt).toLocaleString() : "-"}</div>
            </div>
          ))}
        </div>
      )}

      {!loading && classes.length === 0 && <p className="no-data">No classes found.</p>}

      {toast.show && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast({ show: false, message: "", type: "success" })} />
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Add Class</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className="user-form">
              <div className="form-group">
                <label>Class Name</label>
                <select
                  value={selectedClassName || ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSelectedClassName(v);
                    setOptionName("");
                    setSelectedSection("");
                    if (v !== "OTHER") setClassName(v);
                  }}
                >
                  <option value="">Select class</option>
                  {allowedClassNames.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                  <option value="OTHER">Other (custom)</option>
                </select>

                {selectedClassName === "OTHER" && (
                  <input
                    type="text"
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Custom class name"
                    style={{ marginTop: 10 }}
                  />
                )}

                {selectedClassName && selectedClassName !== "OTHER" && (
                  <div style={{ marginTop: 10 }}>
                    <label>Option (ex: Littéraire, Biochimie) (optional)</label>
                    <input
                      type="text"
                      value={optionName}
                      onChange={(e) => {
                        const v = e.target.value;
                        setOptionName(v);
                        const base = selectedClassName;
                        const section = selectedSection;
                        const opt = v.trim();
                        const full = `${base}${opt ? ` ${opt}` : ''}${section ? ` ${section}` : ''}`.trim();
                        setClassName(full);
                      }}
                      placeholder="Option"
                      style={{ marginTop: 6 }}
                    />

                    <label style={{ marginTop: 10 }}>Section</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {Array.from({ length: 26 }).map((_, i) => {
                        const letter = String.fromCharCode(65 + i);
                        return (
                          <button
                            key={letter}
                            type="button"
                            onClick={() => {
                              setSelectedSection(letter);
                              const base = selectedClassName;
                              const opt = optionName.trim();
                              const full = `${base}${opt ? ` ${opt}` : ''} ${letter}`.trim();
                              setClassName(full);
                            }}
                            style={{
                              padding: "4px 8px",
                              background: selectedSection === letter ? "#ddd" : "#fff",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                            }}
                          >
                            {letter}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSection("");
                          const base = selectedClassName;
                          const opt = optionName.trim();
                          const full = `${base}${opt ? ` ${opt}` : ''}`.trim();
                          setClassName(full);
                        }}
                        style={{ padding: "4px 8px" }}
                      >
                        No section
                      </button>
                    </div>

                    <div style={{ marginTop: 10, fontSize: 12, color: '#666' }}>
                      Final name: <strong>{className || '-'}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleCreateClass}>
                  Create Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
