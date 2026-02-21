"use client";

import { useState, useEffect } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaFilter, FaDownload, FaUpload } from "react-icons/fa";
import "./users.css";

/* ---------------- Translation System ---------------- */

const translations = {
  fr: {
    users: "Utilisateurs",
    addUser: "Ajouter un utilisateur",
    editUser: "Modifier l'utilisateur",
    updateUser: "Mettre à jour l'utilisateur",
    createUser: "Créer l'utilisateur",
    name: "Nom",
    email: "Email",
    role: "Rôle",
    school: "École",
    status: "Statut",
    createdAt: "Créé le",
    actions: "Actions",
    searchUsers: "Rechercher des utilisateurs...",
    allRoles: "Tous les rôles",
    allStatus: "Tous les statuts",
    active: "Actif",
    inactive: "Inactif",
    loading: "Chargement",
    noUsersFound: "Aucun utilisateur trouvé",
    cancel: "Annuler",
    profileImage: "Image de profil",
  },
  en: {
    users: "Users",
    addUser: "Add User",
    editUser: "Edit User",
    updateUser: "Update User",
    createUser: "Create User",
    name: "Name",
    email: "Email",
    role: "Role",
    school: "School",
    status: "Status",
    createdAt: "Created At",
    actions: "Actions",
    searchUsers: "Search users...",
    allRoles: "All Roles",
    allStatus: "All Status",
    active: "Active",
    inactive: "Inactive",
    loading: "Loading",
    noUsersFound: "No users found",
    cancel: "Cancel",
    profileImage: "Profile Image",
  },
};

function useTranslation(language: "fr" | "en") {
  return translations[language];
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  school?: string;
  status: 'active' | 'inactive';
  createdAt: string;
  password?: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "teacher",
    school: "",
    status: "active" as "active" | "inactive",
    password: "",
    profile_image: ""
  });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const t = useTranslation("en");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      console.log("Fetching users with token:", token ? "Token present" : "No token");
      const response = await fetch('http://localhost:5000/api/users/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log("Response status:", response.status);
      console.log("Response ok:", response.ok);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(`Failed to fetch users: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Response data:", data);
      
      // Check if data has the expected structure
      if (!data || !data.users || !Array.isArray(data.users)) {
        console.error("Invalid API response structure:", data);
        throw new Error("Invalid API response structure");
      }
      
      // Transform API response to match frontend User interface
      const transformedUsers = data.users.map((user: any) => ({
        id: user.id ? user.id.toString() : "",
        name: user.name || "",
        email: user.email || "",
        role: user.role || "",
        school: user.school || "",
        status: user.status || "active",
        createdAt: user.created_at ? new Date(user.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        password: user.password || ""
      }));
      console.log("Transformed users:", transformedUsers);
      setUsers(transformedUsers);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching users:", error);
      // Fallback to empty array if API fails
      setUsers([]);
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    setFormData({
      name: "",
      email: "",
      role: "teacher",
      school: "",
      status: "active",
      password: "",
      profile_image: ""
    });
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role as any,
      school: user.school || "",
      status: user.status,
      password: user.password || "",
      profile_image: ""
    });
    setIsModalOpen(true);
  };


  const handleChangePassword = async (userId: string, newPassword: string) => {
    if (!newPassword) {
      alert("Please enter a new password");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`http://localhost:5000/api/users/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });
      
      if (response.ok) {
        alert("Password updated successfully");
        // Refresh the users list
        fetchUsers();
      } else {
        console.error("Failed to update password");
        alert("Failed to update password");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      alert("Error updating password");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/users/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          setUsers(users.filter(user => user.id !== userId));
        } else {
          console.error("Failed to delete user");
        }
      } catch (error) {
        console.error("Error deleting user:", error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user via API
        const token = localStorage.getItem("token");
        const response = await fetch(`http://localhost:5000/api/users/users/${editingUser.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          const updatedUser = await response.json();
          setUsers(users.map(user => 
            user.id === editingUser.id 
              ? updatedUser
              : user
          ));
        } else {
          console.error("Failed to update user");
          const errorText = await response.text();
          console.error("Error response:", errorText);
        }
      } else {
        
        const token = localStorage.getItem("token");
        const response = await fetch('http://localhost:5000/api/users/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData),
        });
        
        if (response.ok) {
          const newUser = await response.json();
          setUsers([...users, newUser]);
        } else {
          console.error("Failed to create user");
          const errorText = await response.text();
          console.error("Error response:", errorText);
        }
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving user:", error);
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const exportUsers = () => {
    const csvContent = [
      ["Name", "Email", "Role", "School", "Status", "Created At"],
      ...filteredUsers.map(user => [
        user.name,
        user.email,
        user.role,
        user.school || "",
        user.status,
        user.createdAt
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  return (
    <div className="users-page">
      <div className="page-header">
        <h1>{t.users}</h1>
        <div className="header-actions">
          <button className="btn-export" onClick={exportUsers}>
            <FaDownload /> Export CSV
          </button>
          <button className="btn-add" onClick={handleAddUser}>
            <FaPlus /> {t.addUser}
          </button>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <FaSearch />
          <input
            type="text"
            placeholder={t.searchUsers}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="filters">
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">{t.allRoles}</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">{t.allStatus}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>{t.name}</th>
              <th>{t.email}</th>
              <th>{t.role}</th>
              <th>{t.school}</th>
              <th>Password</th>
              <th>{t.status}</th>
              <th>{t.createdAt}</th>
              <th>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="loading">
                  {t.loading}...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="no-data">
                  {t.noUsersFound}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.school || "-"}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {user.password ? '••••••••' : 'No password'}
                      </span>
                      <button
                        className="btn-edit"
                        onClick={() => {
                          const newPassword = prompt('Enter new password:', '');
                          if (newPassword !== null) {
                            handleChangePassword(user.id, newPassword);
                          }
                        }}
                        style={{ padding: '2px 6px', fontSize: '10px' }}
                      >
                        Change
                      </button>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {user.status}
                    </span>
                  </td>
                  <td>{user.createdAt}</td>
                  <td className="actions">
                    <button
                      className="btn-edit"
                      onClick={() => handleEditUser(user)}
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingUser ? t.editUser : t.addUser}</h2>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="user-form">
              <div className="form-group">
                <label>{t.name}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t.email}</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>{t.role}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as any})}
                >
                  <option value="admin">Admin</option>
                  <option value="teacher">Teacher</option>
                  <option value="student">Student</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>{t.school}</label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => setFormData({...formData, school: e.target.value})}
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  placeholder="Leave empty to keep current password"
                />
              </div>
              
              <div className="form-group">
                <label>{t.status}</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                >
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>{t.profileImage}</label>
                <div className="image-upload">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <span className="upload-icon">
                    <FaUpload />
                  </span>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-save">
                  {editingUser ? t.updateUser : t.createUser}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
