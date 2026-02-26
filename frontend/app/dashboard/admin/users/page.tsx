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
  status?: string;
  createdAt?: string;
  password?: string;
  profile_image?: string;
};

type School = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<User>({
    id: "",
    name: "",
    email: "",
    role: "TEACHER",
    password: "",
    school: "",
    status: "active",
    profile_image: "",
  });
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  // ================= SHOW TOAST =================
  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  // ================= FETCH SCHOOLS =================
  const fetchSchools = async () => {
    try {
      const response = await fetch(`${API_URL}/api/schools`);
      if (!response.ok) {
        throw new Error("Failed to fetch schools");
      }
      const data = await response.json();
      setSchools(data.schools || []);
    } catch (err) {
      console.error("Fetch schools error:", err);
      setSchools([]);
    }
  };

  // ================= RESET FORM =================
  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      role: "TEACHER",
      password: "",
      school: "",
      status: "active",
      profile_image: "",
    });
  };

  // ================= FETCH USERS =================
  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      console.log("Fetching users from:", `${API_URL}/api/users/`);
      const response = await fetch(`${API_URL}/api/users/`);
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error:", errorText);
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Response data:", data);
      
      if (!data || !data.users) {
        console.error("Invalid response structure:", data);
        throw new Error("Invalid response from server");
      }
      
      const transformedUsers = data.users.map((user: any) => ({
        id: user.id?.toString() || "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        status: user.status || "active",
        school: user.school_id || "",
        profile_image: user.profile_image || "",
        createdAt: user.created_at
          ? new Date(user.created_at).toLocaleDateString()
          : "",
      }));
      console.log("Transformed users:", transformedUsers);
      setUsers(transformedUsers);
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
      console.log("Updating user:", editingUser);
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingUser,
          id: parseInt(editingUser.id) // Ensure ID is sent as number
        }),
      });
      
      console.log("Update response status:", response.status);
      console.log("Update response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Update response error:", errorText);
        throw new Error(`Failed to update user: ${response.status} - ${errorText}`);
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
      const response = await fetch(`${API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to create user");
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
    fetchUsers();
    fetchSchools();
  }, []);

  return (
    <div className="users-page">
      {/* HEADER */}
      <div className="page-header">
        <h1>Users Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Add User
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
                <th>Email</th>
                <th>Role</th>
                <th>School</th>
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
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.school || "-"}</td>
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td>
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
              <h2>{editingUser ? "Edit User" : "Create User"}</h2>
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
                <label>Email</label>
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
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, role: e.target.value })
                      : setFormData({ ...formData, role: e.target.value })
                  }
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  <option value="ADMIN">Admin</option>
                  <option value="TEACHER">Teacher</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>

              {/* School */}
              <div className="form-group">
                <label>School</label>
                <select
                  value={editingUser ? editingUser.school : formData.school}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...editingUser, school: e.target.value })
                      : setFormData({ ...formData, school: e.target.value })
                  }
                >
                  <option value="">Select School</option>
                  {schools.map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>

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
