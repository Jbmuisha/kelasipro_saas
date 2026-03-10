"use client";

import { useEffect, useState } from "react";
import "./users.css";

// Simple toast notification component
const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

const API_URL = "http://localhost:5000";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  school?: string;
  class_id?: string;
  status?: string;
  createdAt?: string;
  password?: string;
  profile_image?: string;
  unique_id?: string;
  children?: any[];
  children_ids?: string[];
};

export default function SecretaryUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<User>({
    id: "",
    name: "",
    email: "",
    role: "STUDENT",
    password: "",
    school: "",
    status: "active",
    profile_image: "",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      role: "STUDENT",
      password: "",
      school: currentUser?.school_id || "",
      status: "active",
      profile_image: "",
      class_id: "",
      children_ids: [],
    });
  };

  // ================= FETCH CLASSES =================
  const fetchClasses = async () => {
    if (!currentUser?.school_id) return;
    try {
      const response = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}`);
      if (response.ok) {
        const data = await response.json();
        setClasses(data.classes || []);
      }
    } catch (err) {
      console.error("Fetch classes error:", err);
    }
  };

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    if (!currentUser?.school_id) return;
    
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/users/?school_id=${currentUser.school_id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const data = await response.json();
      
      const transformedUsers = data.users.map((user: any) => ({
        id: user.id?.toString() || "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        status: user.status || "active",
        school: user.school_id || "",
        class_id: user.class_id?.toString() || "",
        profile_image: user.profile_image || "",
        unique_id: user.unique_id || "",
        children: user.children || [],
        children_ids: user.children?.map((c: any) => c.id.toString()) || [],
        createdAt: user.created_at
          ? new Date(user.created_at).toLocaleDateString()
          : "",
      }));
      setUsers(transformedUsers);
      setAllStudents(transformedUsers.filter((u: User) => u.role === "STUDENT"));
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= UPDATE =================
  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingUser,
          id: parseInt(editingUser.id)
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update user`);
      }
      
      fetchUsers();
      setEditingUser(null);
      setShowModal(false);
      showToast("User updated successfully!", "success");
    } catch (err) {
      console.error("Update user error:", err);
      showToast("Failed to update user. Please try again.", "error");
    }
  };

  // ================= CREATE =================
  const handleCreateUser = async () => {
    try {
      const requestData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        status: formData.status,
        profile_image: formData.profile_image,
        school_id: currentUser?.school_id
      };

      if (formData.role === "STUDENT") {
        if (!formData.class_id) {
          showToast("Please select a class for the student.", "error");
          return;
        }
        requestData.class_id = formData.class_id;
      }
      
      if (formData.role === "PARENT" && formData.children_ids) {
        requestData.children_ids = formData.children_ids;
      }
      
      const response = await fetch(`${API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to create user";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) errorMessage = errorData.error;
        } catch (e) {
          errorMessage = errorText;
        }
        throw new Error(errorMessage);
      }
      
      fetchUsers();
      setShowModal(false);
      showToast("User created successfully!", "success");
    } catch (err) {
      console.error("Create user error:", err);
      showToast("Failed to create user. Please try again.", "error");
    }
  };

  // ================= DELETE =================
  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }
    
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE" });
      
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      
      fetchUsers();
      showToast("User deleted successfully!", "success");
    } catch (err) {
      console.error("Delete user error:", err);
      showToast("Failed to delete user. Please try again.", "error");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setEditingUser(null);
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };

  useEffect(() => {
    if (currentUser?.school_id) {
      fetchUsers();
      fetchClasses();
    }
  }, [currentUser]);

  // Define which roles the Secretary can manage (create/edit/delete)
  const canManageRole = (role: string) => {
    return ["STUDENT", "PARENT"].includes(role);
  };

  return (
    <div className="users-page">
      {/* HEADER */}
      <div className="page-header">
        <h1>All Users Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Add Student/Parent
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <p className="no-data">{error}</p>}

      {/* LOADING */}
      {loading && <p className="loading">Loading users...</p>}

      {/* TABLE */}
      {!loading && users.length > 0 && (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>ID / Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    {user.profile_image ? (
                      <img
                        src={user.profile_image}
                        alt={user.name}
                        className="profile-thumb"
                      />
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>{user.name}</td>
                  <td>
                    {user.unique_id && <div><strong>ID:</strong> {user.unique_id}</div>}
                    {user.email && <div>{user.email}</div>}
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                    {user.role === "STUDENT" && user.class_id && (
                      <div style={{ fontSize: '0.85em', marginTop: '4px', color: '#666' }}>
                        Class: {classes.find(c => c.id.toString() === user.class_id)?.name || 'Unknown'}
                      </div>
                    )}
                    {user.role === "PARENT" && user.children && user.children.length > 0 && (
                      <div style={{ fontSize: '0.85em', marginTop: '4px', color: '#666' }}>
                        Children: {user.children.map((c: any) => c.name).join(', ')}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>
                    {canManageRole(user.role) ? (
                      <div className="actions">
                        <button
                          className="btn-edit"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted">View Only</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && users.length === 0 && (
        <p className="no-data">No users found.</p>
      )}

      {/* TOAST NOTIFICATION */}
      {toast.show && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast({ show: false, message: "", type: "success" })}
        />
      )}

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? "Edit User" : "Add Student/Parent"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="user-form">
              {/* Name */}
              <div className="form-group">
                <label>Name</label>
                <input
                  value={editingUser ? editingUser.name : formData.name}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, name: e.target.value })
                      : setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label>Email (Optional for Students/Parents)</label>
                <input
                  value={editingUser ? editingUser.email : formData.email}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, email: e.target.value })
                      : setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={editingUser ? editingUser.password || "" : formData.password}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, password: e.target.value })
                      : setFormData({ ...formData, password: e.target.value })
                  }
                  placeholder={editingUser ? "Leave blank to keep current password" : ""}
                />
              </div>

              {/* Role */}
              <div className="form-group">
                <label>Role</label>
                <select
                  value={editingUser ? editingUser.role : formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    if (editingUser) {
                      setEditingUser({ ...editingUser, role: newRole });
                    } else {
                      setFormData({ ...formData, role: newRole });
                    }
                  }}
                  disabled={!!editingUser} // Disallow role change on edit for simplicity
                >
                  <option value="STUDENT">Student</option>
                  <option value="PARENT">Parent</option>
                </select>
              </div>

              {/* Class Selection for Student */}
              {(editingUser ? editingUser.role : formData.role) === "STUDENT" && (
                <div className="form-group">
                  <label>Class</label>
                  <select
                    value={editingUser ? editingUser.class_id || "" : formData.class_id || ""}
                    onChange={(e) => {
                      if (editingUser) {
                        setEditingUser({ ...editingUser, class_id: e.target.value });
                      } else {
                        setFormData({ ...formData, class_id: e.target.value });
                      }
                    }}
                  >
                    <option value="">Select a Class</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>{cls.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Children Selection for Parent */}
              {(editingUser ? editingUser.role : formData.role) === "PARENT" && (
                <div className="form-group">
                  <label>Children (Students)</label>
                  <select
                    multiple
                    value={editingUser ? editingUser.children_ids || [] : formData.children_ids || []}
                    onChange={(e) => {
                      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                      if (editingUser) {
                        setEditingUser({ ...editingUser, children_ids: selectedOptions });
                      } else {
                        setFormData({ ...formData, children_ids: selectedOptions });
                      }
                    }}
                    style={{ height: '100px' }}
                  >
                    {allStudents.map((student) => (
                      <option key={student.id} value={student.id}>{student.name}</option>
                    ))}
                  </select>
                  <small className="form-hint">Hold Ctrl (Windows) or Cmd (Mac) to select multiple students.</small>
                </div>
              )}

              {/* Status */}
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingUser ? editingUser.status : formData.status}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, status: e.target.value })
                      : setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Profile Image */}
              <div className="form-group">
                <label>Profile Image</label>
                {editingUser && editingUser.profile_image && (
                  <div className="current-profile-image">
                    <p>Current Profile Image:</p>
                    <img src={editingUser.profile_image} alt="Current Profile" className="current-profile-thumb" />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      const base64 = reader.result as string;
                      editingUser
                        ? setEditingUser({ ...editingUser, profile_image: base64 })
                        : setFormData({ ...formData, profile_image: base64 });
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <small className="form-hint">Select a new image to update the profile picture</small>
              </div>

              {/* ACTIONS */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={editingUser ? handleUpdateUser : handleCreateUser}
                >
                  {editingUser ? "Save Changes" : "Create User"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
