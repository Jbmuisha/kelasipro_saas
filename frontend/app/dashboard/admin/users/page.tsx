"use client";
import { useEffect, useState } from "react";
import "./users.css";

const API_URL = "http://localhost:5000";

const Toast = ({ message, type, onClose }: { message: string; type: string; onClose: () => void }) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className="toast-close" onClick={onClose}>×</button>
  </div>
);

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  password?: string;
  profile_image?: string;
  unique_id?: string;
  school_id?: string;
  admin_level?: string;
  created_at?: string;
};

type School = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  school_type?: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<User>({
    id: "",
    name: "",
    email: "",
    role: "SUPER_ADMIN",
    password: "",
    school_id: "",
    status: "active",
    profile_image: "",
    unique_id: "",
  });
  const [editingPassword, setEditingPassword] = useState<string>("");
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>("");
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [currentUser, setCurrentUser] = useState<any>(null);

  const showToast = (message: string, type: string = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${API_URL}/api/schools`);
      if (!res.ok) return;
      const data = await res.json();
      setSchools(data.schools || []);
    } catch {
      setSchools([]);
    }
  };

  const resetForm = () => {
    setFormData({
      id: "",
      name: "",
      email: "",
      role: "SUPER_ADMIN",
      password: "",
      school_id: "",
      status: "active",
      profile_image: "",
      unique_id: "",
    });
    setEditingPassword("");
    setEditingUser(null);
    setSelectedSchoolType("");
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_URL}/api/users?role=SUPER_ADMIN`);
      if (!response.ok) throw new Error(`Failed to fetch users: ${response.status}`);
      const data = await response.json();
      if (!data || !data.users) throw new Error("Invalid response from server");
      
      const transformedUsers = data.users.map((user: any) => ({
        id: user.id?.toString() || "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        status: user.status || "active",
        school_id: user.school_id || "",
        profile_image: user.profile_image || "",
        unique_id: user.unique_id || "",
        created_at: user.created_at ? new Date(user.created_at).toLocaleDateString() : "",
      }));
      setUsers(transformedUsers);
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("Could not load users.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    try {
      const updateData: any = {
        name: formData.name,
        email: formData.email,
        status: formData.status,
        school_id: formData.school_id,
      };

      // Only include password if it was provided
      if (editingPassword) {
        updateData.password = editingPassword;
      }

      // Only include admin_level if not SUPER_ADMIN
      if (formData.role !== "SUPER_ADMIN" && selectedSchoolType) {
        updateData.admin_level = selectedSchoolType;
      }

      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });
      
      if (!response.ok) throw new Error(`Failed to update user: ${response.status}`);
      fetchUsers();
      setShowModal(false);
      showToast("User updated successfully!", "success");
    } catch (err) {
      console.error("Update user error:", err);
      showToast("Failed to update user. Please try again.", "error");
    }
  };

  const handleCreateUser = async () => {
    try {
      const requestData: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        status: formData.status,
        school_id: formData.role === "SUPER_ADMIN" ? null : formData.school_id,
      };

      if (formData.role === "SCHOOL_ADMIN" && selectedSchoolType) {
        requestData.admin_level = selectedSchoolType;
      }
      
      const response = await fetch(`${API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText);
      }
      
      fetchUsers();
      setShowModal(false);
      showToast("User created successfully!", "success");
    } catch (err) {
      console.error("Create user error:", err);
      showToast("Failed to create user. Please try again.", "error");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete user");
      fetchUsers();
      showToast("User deleted successfully!", "success");
    } catch (err) {
      console.error("Delete user error:", err);
      showToast("Failed to delete user. Please try again.", "error");
    }
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      school_id: user.school_id || "",
      status: user.status || "active",
      profile_image: user.profile_image || "",
      unique_id: user.unique_id || "",
    });
    setEditingPassword("");
    setSelectedSchoolType(user.admin_level || "");
    setShowModal(true);
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
    fetchUsers();
    fetchSchools();
  }, []);

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>Super Admins Management</h1>
        <div className="header-actions">
          <button className="btn-add" onClick={openCreateModal}>
            + Add User
          </button>
        </div>
      </div>

      {error && <p className="no-data">{error}</p>}
      {loading && <p className="loading">Loading users...</p>}

      {!loading && users.length > 0 && (
        <div className="users-table-container">
          <table className="users-table">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>ID / Email</th>
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
                    <div className="profile-cell">
                      {user.profile_image ? (
                        <img
                          src={user.profile_image}
                          alt={user.name}
                          className="profile-thumb"
                          style={{
                            width: "50px",
                            height: "50px",
                            objectFit: "cover",
                            borderRadius: "50%",
                          }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "";
                          }}
                        />
                      ) : (
                        <div
                          className="profile-placeholder"
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "50%",
                            backgroundColor: "#ddd",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "20px",
                            color: "#666",
                          }}
                        >
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>{user.name}</td>
                  <td>
                    {user.unique_id && <div>
                      <strong>ID:</strong> {user.unique_id}
                    </div>}
                    {user.email && <div>{user.email}</div>}
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </td>
                  <td>{user.school_id || "-"}</td>
                  <td>
                    <span className={`status-badge ${user.status || 'active'}`}>{user.status || 'active'}</span>
                  </td>
                  <td>{user.created_at}</td>
                  <td>
                    <div className="actions">
                      <button className="btn-edit" onClick={() => openEditModal(user)}>
                        Edit
                      </button>
                      <button className="btn-delete" onClick={() => handleDeleteUser(user.id)}>
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

      {!loading && users.length === 0 && <p className="no-data">No users found.</p>}

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
              <h2>{editingUser ? "Edit User" : "Create User"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <div className="user-form">
              <div className="form-group">
                <label>Name</label>
                <input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Email</label>
                <input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={editingPassword}
                  onChange={(e) => setEditingPassword(e.target.value)}
                  placeholder={editingUser ? "Leave blank to keep current password" : ""}
                />
              </div>

              <div className="form-group">
                <label>Role</label>
                <select
                  value={editingUser ? editingUser.role : formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value;
                    if (editingUser) {
                      setEditingUser({ ...editingUser, role: newRole } as any);
                    } else {
                      setFormData({ ...formData, role: newRole } as any);
                    }
                  }}
                >
                  <option value="SUPER_ADMIN">Super Admin</option>
                  {currentUser?.role === "SCHOOL_ADMIN" && (
                    <>
                      <option value="TEACHER">Teacher</option>
                      <option value="SECRETARY">Secretary</option>
                      <option value="ASSISTANT">Assistant</option>
                    </>
                  )}
                  {currentUser?.role === "SECRETARY" && (
                    <>
                      <option value="STUDENT">Student</option>
                      <option value="PARENT">Parent</option>
                    </>
                  )}
                </select>
              </div>

              {(editingUser?.role !== "SUPER_ADMIN" || formData.role !== "SUPER_ADMIN") && (
                <div className="form-group">
                  <label>School</label>
                  <select
                    value={editingUser ? editingUser.school_id : formData.school_id}
                    onChange={(e) => {
                      const newSchoolId = e.target.value;
                      if (editingUser) {
                        setEditingUser({ ...(editingUser as any), school_id: newSchoolId } as any);
                      } else {
                        setFormData({ ...formData, school_id: newSchoolId } as any);
                      }
                    }}
                    required={editingUser?.role !== "SUPER_ADMIN" && formData.role !== "SUPER_ADMIN"}
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.school_type || "mixed"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {((editingUser?.role === "SCHOOL_ADMIN") || (formData.role === "SCHOOL_ADMIN")) && (
                <div className="form-group">
                  <label>Admin Level</label>
                  {selectedSchoolType && selectedSchoolType !== "mixed" ? (
                    <div className="auto-level">
                      <span className="auto-level-badge">{selectedSchoolType}</span>
                      <small className="form-hint">This school is {selectedSchoolType}</small>
                      <input
                        type="hidden"
                        name="admin_level"
                        value={selectedSchoolType}
                        onChange={(e) => {
                          if (editingUser) {
                            setEditingUser({ ...(editingUser as any), admin_level: e.target.value } as any);
                          } else {
                            setFormData({ ...formData, admin_level: e.target.value } as any);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <select
                      value={(editingUser as any)?.admin_level || (formData as any).admin_level || ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (editingUser) {
                          setEditingUser({ ...(editingUser as any), admin_level: v } as any);
                        } else {
                          setFormData({ ...(formData as any), admin_level: v } as any);
                        }
                      }}
                    >
                      <option value="">Select level</option>
                      <option value="maternelle">Maternelle</option>
                      <option value="primaire">Primaire</option>
                      <option value="secondaire">Secondaire</option>
                      {selectedSchoolType === "mixed" && (
                        <option value="mixed">Mixed (All Levels)</option>
                      )}
                    </select>
                  )}
                </div>
              )}

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingUser ? editingUser.status : formData.status}
                  onChange={(e) =>
                    editingUser
                      ? setEditingUser({ ...(editingUser as any), status: e.target.value } as any)
                      : setFormData({ ...formData, status: e.target.value } as any)
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button className="btn-save" onClick={editingUser ? handleUpdateUser : handleCreateUser}>
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