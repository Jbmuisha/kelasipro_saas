"use client";
import { useEffect, useState } from 'react';
import './admins.css';

const API_URL = 'http://localhost:5000';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  profile_image?: string;
  school_id: string;
  admin_level?: string;
  created_at?: string;
}

interface School {
  id: string;
  name: string;
  school_type?: string;
}

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => (
  <div className={`toast toast-${type}`}>
    <span>{message}</span>
    <button className='toast-close' onClick={onClose}>×</button>
  </div>
);

interface FormData {
  name: string;
  email: string;
  password: string;
  school_id: string;
  admin_level: string;
  status: string;
  profile_image?: string;
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<User[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [schoolsError, setSchoolsError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    school_id: '',
    admin_level: '',
    status: 'active',
    profile_image: ''
  });
  const [selectedSchoolType, setSelectedSchoolType] = useState('');
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  const fetchSchools = async () => {
    try {
      const res = await fetch(`${API_URL}/api/schools`);
      if (!res.ok) {
        setSchoolsError('Failed to load schools.');
        setSchools([]);
        return;
      }
      const data = await res.json();
      setSchools(data.schools || []);
      setSchoolsError('');
    } catch {
      setSchoolsError('Cannot connect to server.');
      setSchools([]);
    }
  };

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users?role=SCHOOL_ADMIN`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAdmins(data.users || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load school admins');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'SCHOOL_ADMIN' })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Creation failed');
      }
      fetchAdmins();
      setShowModal(false);
      showToast('School admin created successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Creation failed', 'error');
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingAdmin) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${editingAdmin.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, role: 'SCHOOL_ADMIN', id: editingAdmin.id })
      });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || 'Update failed');
      }
      fetchAdmins();
      setShowModal(false);
      showToast('School admin updated!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this school admin?')) return;
    try {
      const res = await fetch(`${API_URL}/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      fetchAdmins();
      showToast('School admin deleted successfully!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    }
  };

  const openEdit = (admin: User) => {
    setEditingAdmin(admin);
    const school = schools.find(s => String(s.id) === String(admin.school_id));
    const schoolType = school?.school_type || 'mixed';
    
    setFormData({
      name: admin.name,
      email: admin.email,
      password: '',
      school_id: String(admin.school_id),
      admin_level: admin.admin_level || (schoolType !== 'mixed' ? schoolType : ''),
      status: admin.status || 'active',
      profile_image: admin.profile_image || ''
    });
    setSelectedSchoolType(schoolType);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      school_id: '',
      admin_level: '',
      status: 'active',
      profile_image: ''
    });
    setSelectedSchoolType('');
    setEditingAdmin(null);
    setShowModal(true);
  };

  useEffect(() => {
    fetchSchools();
    fetchAdmins();
  }, []);

  const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const schoolId = e.target.value;
    
    if (schoolId) {
      const school = schools.find(s => String(s.id) === schoolId);
      if (school) {
        const schoolType = school.school_type || 'mixed';
        setSelectedSchoolType(schoolType);
        setFormData(prev => ({ 
          ...prev, 
          school_id: schoolId, 
          admin_level: schoolType !== 'mixed' ? schoolType : '' 
        }));
      } else {
        setFormData(prev => ({ ...prev, school_id: schoolId }));
      }
    } else {
      setFormData(prev => ({ ...prev, school_id: '', admin_level: '' }));
      setSelectedSchoolType('');
    }
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => String(s.id) === String(schoolId));
    return school ? school.name : 'Unknown School';
  };

  const getSchoolType = (adminLevel: string | undefined, schoolId: string) => {
    if (adminLevel) {
      return adminLevel.charAt(0).toUpperCase() + adminLevel.slice(1);
    }
    const school = schools.find(s => String(s.id) === String(schoolId));
    const type = school?.school_type || 'mixed';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const isAdminLevelDisabled = () => {
    return selectedSchoolType && selectedSchoolType !== 'mixed';
  };

  return (
    <div className='users-page'>
      <div className='page-header'>
        <h1>School Admins Management</h1>
        <button className='btn-add' onClick={resetForm}>
          + Add School Admin
        </button>
      </div>

      {error && <p className='no-data'>{error}</p>}
      {schoolsError && <p className='no-data' style={{ color: '#e53e3e' }}>{schoolsError}</p>}
      {loading && <p className='loading'>Loading school admins...</p>}

      {!loading && admins.length === 0 && <p className='no-data'>No school admins found. Create one using the button above.</p>}

      {admins.length > 0 && (
        <div className='users-table-container'>
          <table className='users-table'>
            <thead>
              <tr>
                <th>Profile</th>
                <th>Name</th>
                <th>Email</th>
                <th>School</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map(admin => (
                <tr key={admin.id}>
                  <td>
                    <div className='profile-cell'>
                      <img
                        src={admin.profile_image || 'https://i.pravatar.cc/50'}
                        alt={admin.name}
                        className='profile-thumb'
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://i.pravatar.cc/50';
                        }}
                      />
                    </div>
                  </td>
                  <td>{admin.name}</td>
                  <td>{admin.email}</td>
                  <td>{getSchoolName(admin.school_id)}</td>
                  <td>
                    <span className='role-badge'>{getSchoolType(admin.admin_level, admin.school_id)}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${admin.status || 'active'}`}>
                      {(admin.status || 'active').charAt(0).toUpperCase() + (admin.status || 'active').slice(1)}
                    </span>
                  </td>
                  <td>
                    <div className='actions'>
                      <button className='btn-edit' onClick={() => openEdit(admin)}>Edit</button>
                      <button className='btn-delete' onClick={() => handleDelete(admin.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ show: false, message: '', type: 'success' })}
        />
      )}

      {showModal && (
        <div className='modal-overlay'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h2>{editingAdmin ? 'Edit School Admin' : 'Create School Admin'}</h2>
              <button className='modal-close' onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>
            <div className='modal-body'>
              <form onSubmit={editingAdmin ? handleUpdate : handleCreate}>
                <div className='form-group'>
                  <label>Name *</label>
                  <input
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>Email *</label>
                  <input
                    type='email'
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
                <div className='form-group'>
                  <label>Password</label>
                  <input
                    type='password'
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingAdmin ? 'Leave blank to keep current' : 'Required for new admin'}
                    required={!editingAdmin}
                  />
                </div>
                <div className='form-group'>
                  <label>Profile Image</label>
                  <input
                    type='file'
                    accept='image/*'
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, profile_image: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  {formData.profile_image && (
                    <div style={{ marginTop: '10px' }}>
                      <img 
                        src={formData.profile_image} 
                        alt='Preview' 
                        style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
                <div className='form-group'>
                  <label>School *</label>
                  <select
                    value={formData.school_id}
                    onChange={handleSchoolChange}
                    required
                  >
                    <option value=''>Select School</option>
                    {schools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name} ({school.school_type || 'mixed'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className='form-group'>
                  <label>Admin Level</label>
                  {selectedSchoolType && selectedSchoolType !== 'mixed' ? (
                    <div style={{ padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: '8px', background: '#f7fafc' }}>
                      <div style={{ fontWeight: '600', color: '#667eea', marginBottom: '4px' }}>
                        {selectedSchoolType.charAt(0).toUpperCase() + selectedSchoolType.slice(1)} (Auto-set)
                      </div>
                      <small style={{ color: '#718096' }}>
                        This school is a "{selectedSchoolType}" school
                      </small>
                    </div>
                  ) : (
                    <select
                      value={formData.admin_level}
                      onChange={e => setFormData({ ...formData, admin_level: e.target.value })}
                    >
                      <option value=''>Select Level</option>
                      <option value='maternelle'>Maternelle</option>
                      <option value='primaire'>Primaire</option>
                      <option value='secondaire'>Secondaire</option>
                      <option value='mixed'>Mixed (All Levels)</option>
                    </select>
                  )}
                </div>
                <div className='form-group'>
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value='active'>Active</option>
                    <option value='inactive'>Inactive</option>
                  </select>
                </div>
                <div className='form-actions'>
                  <button type='button' className='btn-cancel' onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type='submit' className='btn-save'>
                    {editingAdmin ? 'Update Admin' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
