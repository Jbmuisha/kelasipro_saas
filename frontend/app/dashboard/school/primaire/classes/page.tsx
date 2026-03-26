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
};

type TeacherOption = { id: number; name: string; email?: string };

export default function PrimaireClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [className, setClassName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);

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
      const response = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}&level=primaire`);
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
          level: "primaire",
          created_by: currentUser?.id || null,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || body.message || "Failed to create class");
      fetchClasses();
      setShowModal(false);
      setClassName("");
      showToast("Class created successfully!");
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error creating class", "error");
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Classes (Primaire)</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={() => setShowModal(true)}>
            + Add Class
          </button>
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
                  <td>{cls.createdAt ? new Date(cls.createdAt).toLocaleString() : "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        value={selectedTeacherByClass[cls.id] || ""}
                        onChange={(e) => setSelectedTeacherByClass((prev) => ({ ...prev, [cls.id]: e.target.value }))}
                      >
                        <option value="">Select teacher</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={String(t.id)}>
                            {t.name}{t.email ? ` (${t.email})` : ""}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => assignTeacherToClass(cls.id)} disabled={!!assigningByClass[cls.id]}>
                        {assigningByClass[cls.id] ? "Assigning..." : "Assign"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                <input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g. 1ere primaire A" />
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
