"use client";

import { useEffect, useState } from "react";
import "./classes.css";

const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

const API_URL = "http://localhost:5000";

type ClassData = {
  id: string;
  name: string;
  school_id: string;
  createdAt: string;
};

export default function SecretaryClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [className, setClassName] = useState("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
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

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchClasses();
    }
  }, [currentUser]);

  const handleCreateClass = async () => {
    if (!className.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/classes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: currentUser.school_id,
          name: className
        })
      });
      if (!response.ok) {
        throw new Error("Failed to create class");
      }
      fetchClasses();
      setShowModal(false);
      setClassName("");
      showToast("Class created successfully!");
    } catch (err) {
      console.error(err);
      showToast("Error creating class", "error");
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
              </tr>
            </thead>
            <tbody>
              {classes.map((cls) => (
                <tr key={cls.id}>
                  <td>{cls.id}</td>
                  <td>{cls.name}</td>
                  <td>{new Date(cls.createdAt).toLocaleDateString()}</td>
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
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="e.g. 1st Grade, Math 101"
                />
              </div>
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn-save" onClick={handleCreateClass}>Create Class</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
