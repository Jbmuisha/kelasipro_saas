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
  unique_id?: string;
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
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState<User>({
    id: "",
    name: "",
    email: "",
    role: "TEACHER",
    password: "",
    school: "",
    status: "active",
    profile_image: "",
    unique_id: "",
  } as any);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolType, setSelectedSchoolType] = useState<string>("");
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
      unique_id: "",
    } as any);
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
      
      const transformedUsers = data.users.map((user: any) => {
        console.log('[DEBUG] User profile_image:', user.profile_image?.substring(0, 50), '...length:', user.profile_image?.length);
        return {
          id: user.id?.toString() || "",
          name: user.name || "",
          email: user.email || "",
          role: user.role || "",
          status: user.status || "active",
          school: user.school_id || "",
          profile_image: user.profile_image || "",
          unique_id: user.unique_id || "",
          createdAt: user.created_at
            ? new Date(user.created_at).toLocaleDateString()
            : "",
        };
      });
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
      // Get image from form if user changed it (in preview)
      const profileImageUrl = (formData as any).profile_preview || null;
      // If not changed, keep existing
      const finalProfileImage = profileImageUrl || editingUser.profile_image;
      
      console.log("[UPDATE] Sending profile_image:", finalProfileImage ? `base64(${finalProfileImage.substring(0, 30)}...)` : 'unchanged');
      console.log("Updating user:", editingUser);
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingUser,
          profile_image: finalProfileImage,
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
      console.log("Creating user with data:", formData);
      
      // If an image was selected, use the base64 preview directly (simpler than file upload)
      const profileImageUrl = (formData as any).profile_preview || null;

      const requestData = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        password: formData.password,
        status: formData.status,
        // Store base64 directly as profile_image
        profile_image: profileImageUrl,
        // Only include school if it's not SUPER_ADMIN
        school_id: formData.role === "SUPER_ADMIN" ? null : formData.school,
        // For SCHOOL_ADMIN: specify which level they manage
        // Auto-use selectedSchoolType if admin_level is not set (for non-mixed schools)
        admin_level: formData.role === "SCHOOL_ADMIN" ? ((formData as any).admin_level || (selectedSchoolType !== 'mixed' ? selectedSchoolType : null)) : null
      };
      console.log('[CREATE REQUEST] Sending profile_image:', profileImageUrl ? `base64(${profileImageUrl.substring(0, 30)}...)` : 'null');
      
      console.log("Sending request data:", requestData);
      
      const response = await fetch(`${API_URL}/api/users/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });
      
      console.log("Create user response status:", response.status);
      console.log("Create user response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Create user response error:", errorText);
        
        // Try to parse the error response to show a more user-friendly message
        let errorMessage = "Failed to create user";
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse as JSON, use the raw text
          errorMessage = errorText;
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log("Create user result:", result);
      
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
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
      }
    }
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
                          src={user.profile_image || ''}
                          alt={user.name}
                          className="profile-thumb"
                          style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '50%' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '';
                          }}
                        />
                      ) : (
                        <div
                          className="profile-placeholder"
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '50%',
                            backgroundColor: '#ddd',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '20px',
                            color: '#666'
                          }}
                        >
                          {user.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
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
                  onChange={(e) => {
                    const newRole = e.target.value;
                    if (editingUser) {
                      setEditingUser({ ...editingUser, role: newRole });
                    } else {
                      setFormData({ ...formData, role: newRole });
                    }
                  }}
                >
                  {/* Dynamic role options based on current user's role per hierarchy: */}
                  {/* Super Admin: only creates SCHOOL_ADMIN */}
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <>
                      <option value="SCHOOL_ADMIN">School Admin</option>
                    </>
                  )}
                  {/* School Admin: creates TEACHER, SECRETARY, ASSISTANT */}
                  {currentUser?.role === 'SCHOOL_ADMIN' && (
                    <>
                      <option value="TEACHER">Teacher</option>
                      <option value="SECRETARY">Secretary</option>
                      <option value="ASSISTANT">Assistant</option>
                    </>
                  )}
                  {/* Secretary: creates STUDENT, PARENT */}
                  {currentUser?.role === 'SECRETARY' && (
                    <>
                      <option value="STUDENT">Student</option>
                      <option value="PARENT">Parent</option>
                    </>
                  )}
                  {/* Legacy: allow all roles if somehow accessed (backwards compatibility) */}
                  {(!currentUser?.role || 
                    (currentUser?.role !== 'SUPER_ADMIN' && currentUser?.role !== 'SCHOOL_ADMIN' && currentUser?.role !== 'SECRETARY')) && (
                    <>
                      <option value="TEACHER">Teacher</option>
                      <option value="SECRETARY">Secretary</option>
                      <option value="ASSISTANT">Assistant</option>
                      <option value="SCHOOL_ADMIN">School Admin</option>
                      <option value="STUDENT">Student</option>
                      <option value="PARENT">Parent</option>
                    </>
                  )}
                </select>
              </div>

              {/* School - Only show for non-Super Admin roles */}
              {(editingUser?.role !== "SUPER_ADMIN" && formData.role !== "SUPER_ADMIN") && (
                <div className="form-group">
                  <label>School</label>
                  <select
                    value={editingUser ? editingUser.school : formData.school}
                    onChange={(e) => {
                      const newSchool = e.target.value;
                      const selectedSchool = schools.find(s => s.id === newSchool);
                      const schoolType = selectedSchool?.school_type || "";
                      setSelectedSchoolType(schoolType);
                      if (editingUser) {
                        setEditingUser({ ...editingUser, school: newSchool } as any);
                      } else {
                        setFormData({ ...formData, school: newSchool } as any);
                      }
                    }}
                    required={formData.role !== "SUPER_ADMIN"}
                  >
                    <option value="">Select School</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <small className="form-hint">
                    {formData.role === "SUPER_ADMIN" ? "Super Admin has access to all schools" : "Select the school for this user"}
                  </small>
                </div>
              )}

              {/* Admin level - only for SCHOOL_ADMIN */}
              {((editingUser?.role === "SCHOOL_ADMIN") || (formData.role === "SCHOOL_ADMIN")) && (
                <div className="form-group">
                  <label>Admin Level</label>
                  {(selectedSchoolType && selectedSchoolType !== "mixed") ? (
                    /* Auto-set for non-mixed schools - no selection needed */
                    <div className="auto-level">
                      <span className="auto-level-badge">{selectedSchoolType}</span>
                      <small className="form-hint">
                        This school is {selectedSchoolType} - admin will automatically manage {selectedSchoolType} level
                      </small>
                      {/* Hidden field to send the auto value */}
                      <input 
                        type="hidden" 
                        name="admin_level" 
                        value={selectedSchoolType} 
                      />
                    </div>
                  ) : (
                    /* Show dropdown for mixed schools or no school selected */
                    <select
                      value={(editingUser as any)?.admin_level || (formData as any).admin_level || ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (editingUser) {
                          setEditingUser({ ...(editingUser as any), admin_level: v } as any);
                        } else {
                          setFormData({ ...(formData as any), admin_level: v } as any);
                        }
                      }}
                      required={selectedSchoolType === "mixed"}
                    >
                      <option value="">Select level</option>
                      {(selectedSchoolType === "" || selectedSchoolType === "mixed" || selectedSchoolType === "maternelle") && (
                        <option value="maternelle">Maternelle</option>
                      )}
                      {(selectedSchoolType === "" || selectedSchoolType === "mixed" || selectedSchoolType === "primaire") && (
                        <option value="primaire">Primaire</option>
                      )}
                      {(selectedSchoolType === "" || selectedSchoolType === "mixed" || selectedSchoolType === "secondaire") && (
                        <option value="secondaire">Secondaire</option>
                      )}
                      {selectedSchoolType === "mixed" && (
                        <option value="mixed">Mixed (All Levels)</option>
                      )}
                    </select>
                  )}
                  <small className="form-hint">
                    {selectedSchoolType === "mixed" 
                      ? "This is a mixed school - choose which level(s) this admin manages"
                      : selectedSchoolType 
                        ? `This school is ${selectedSchoolType} - admin will manage ${selectedSchoolType}`
                        : "Select a school first to see available levels"
                    }
                  </small>
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
                {(formData as any).profile_preview && (
                  <div className="image-preview" style={{ marginBottom: 10 }}>
                    <img 
                      src={(formData as any).profile_preview} 
                      alt="Preview" 
                      style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ddd' }} 
                    />
                    <span style={{ marginLeft: 10, fontSize: 12, color: '#666' }}>Preview</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    console.log('[IMG SELECTED] File:', file.name, file.size);
                    // Create preview URL
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const result = ev.target?.result as string;
                      console.log('[IMG PREVIEW] Base64 length:', result?.length);
                      setFormData({ ...(formData as any), profile_image_file: file, profile_preview: result } as any);
                    };
                    reader.readAsDataURL(file);
                  }}
                />
                <small className="form-hint">Image will be uploaded and saved as a URL (recommended)</small>
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
