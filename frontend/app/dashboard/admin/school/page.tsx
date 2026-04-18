"use client";

import { useEffect, useState } from "react";
import "@/styles/dashboard.css";
import { useRouter } from "next/navigation";

const API_URL = "http://localhost:5000";

type School = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  password?: string;
  school_type?: string;
  created_at?: string;
};

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button> 
  </div>
);

export default function AdminSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<School>({
    id: "",
    name: "",
    email: "",
    phone: "",
    school_type: "primaire",
    created_at: "",
  });
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH SCHOOLS =================
  const fetchSchools = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Attempting to fetch schools from:", `${API_URL}/api/schools`);
      const response = await fetch(`${API_URL}/api/schools`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Failed to fetch schools: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      setSchools(data.schools || []);
    } catch (err) {
      console.error("Fetch schools error:", err);
      setError("Could not load schools. Please check if the backend server is running on port 5000.");
      setSchools([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      phone: "",
      school_type: "primaire",
      created_at: "",
    });
  };

  // ================= CREATE SCHOOL =================
  const handleCreateSchool = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/schools`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error("Create school error:", data.error || data);
        showToast(data.error || "Failed to create school. Please try again.", "error");
        return;
      }
      
      fetchSchools();
      setShowModal(false);
      showToast("School created successfully!", "success");
    } catch (err) {
      console.error("Create school error:", err);
      showToast("Failed to create school. Please try again.", "error");
    }
  };

  // ================= UPDATE SCHOOL =================
  const handleUpdateSchool = async () => {
    if (!editingSchool) return;
    try {
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_URL}/api/schools/${editingSchool.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(editingSchool),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update school");
      }
      
      fetchSchools();
      setEditingSchool(null);
      setShowModal(false);
      showToast("School updated successfully!", "success");
    } catch (err) {
      console.error("Update school error:", err);
      showToast("Failed to update school. Please try again.", "error");
    }
  };

  // ================= DELETE SCHOOL =================
  const handleDeleteSchool = async (id: string) => {
    if (!confirm("Are you sure you want to delete this school? This action cannot be undone.")) {
      return;
    }
    
    let response: Response | null = null;
    try {
      const token = localStorage.getItem('token') || '';
      response = await fetch(`${API_URL}/api/schools/${id}`, { 
        method: "DELETE",
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Delete school response:", response.status, errorText);
        throw new Error(errorText || "Failed to delete school");
      }
      
      fetchSchools();
      showToast("School deleted successfully!", "success");
    } catch (err: any) {
      console.error("Delete school error:", err);
      let errorMsg = "Failed to delete school. Please check backend logs.";
      try {
        if (response && !response.ok) {
          const errorText = await response.text();
          errorMsg = errorText || errorMsg;
        }
      } catch (parseErr) {
        console.error("Error parsing response:", parseErr);
      }
      showToast(errorMsg, "error");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingSchool(null);
    setShowModal(true);
  };

  const openEditModal = (school: School) => {
    setEditingSchool(school);
    setShowModal(true);
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>School Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Add School
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <p className="no-data">{error}</p>}

      {/* LOADING */}
      {loading && <p className="loading">Loading schools...</p>}

      {/* SCHOOLS TABLE */}
      {!loading && schools.length > 0 && (
        <div className="dashboard-content">
          <div className="table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Password Set</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {schools.map((school) => (
                  <tr key={school.id}>
                    <td>
                      <strong>{school.name}</strong>
                    </td>
                    <td>{school.email || "-"}</td>
                    <td>{school.phone || "-"}</td>
                    <td>
                      {school.password ? (
                        <span className="status-badge status-success">Yes</span>
                      ) : (
                        <span className="status-badge status-warning">No</span>
                      )}
                    </td>
                    <td>{school.created_at ? new Date(school.created_at).toLocaleDateString() : "-"}</td>
                    <td>
                      <div className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => openEditModal(school)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteSchool(school.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && schools.length === 0 && (
        <p className="no-data">No schools found.</p>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* SCHOOL MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingSchool ? "Edit School" : "Add School"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="school-form">
              {/* Name */}
              <div className="form-group">
                <label>School Name *</label>
                <input
                  value={editingSchool ? editingSchool.name : formData.name}
                  onChange={(e) =>
                    editingSchool
                      ? setEditingSchool({ ...editingSchool, name: e.target.value })
                      : setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter school name"
                  required
                />
              </div>

              {/* School Type */}
              <div className="form-group">
                <label>School Type *</label>
                <select
                  value={editingSchool ? editingSchool.school_type || "primaire" : formData.school_type || "primaire"}
                  onChange={(e) =>
                    editingSchool
                      ? setEditingSchool({ ...editingSchool, school_type: e.target.value })
                      : setFormData({ ...formData, school_type: e.target.value })
                  }
                  required
                >
                  <option value="primaire">Primaire</option>
                  <option value="secondaire">Secondaire</option>
                  <option value="maternelle">Maternelle</option>
                  <option value="mixed">Mixed (All Types)</option>
                </select>
              </div>

              {/* ACTIONS */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingSchool ? handleUpdateSchool : handleCreateSchool}
                >
                  {editingSchool ? "Save Changes" : "Create School"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}