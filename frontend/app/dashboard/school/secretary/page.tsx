"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';

type SecretaryItem = {
  id: number;
  name: string;
  email?: string;
  unique_id?: string;
  status?: string;
  profile_image?: string;
};

export default function SchoolSecretaryPage() {
  const [secretaries, setSecretaries] = useState<SecretaryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // create form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);

  // edit modal
  const [editingSecretary, setEditingSecretary] = useState<SecretaryItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editStatus, setEditStatus] = useState('active');
  const [saving, setSaving] = useState(false);

  // password visibility
  const [showCreatePwd, setShowCreatePwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const getSchoolId = () => {
    try {
      const userStr = localStorage.getItem('user');
      const u = userStr ? JSON.parse(userStr) : null;
      if (u?.school_id) return String(u.school_id);
    } catch {}
    return localStorage.getItem('school_id') || null;
  };

  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch { return null; }
  };

  const fetchSecretaries = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const res = await fetch(`${API_URL}/api/users/?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load users');
      const data = await res.json();
      const secs = (data.users || []).filter((u: any) => u.role === 'SECRETARY');
      setSecretaries(secs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecretaries();
  }, []);

  const createSecretary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!password.trim()) {
      setError('Password is required so the secretary can log in.');
      return;
    }
    setCreating(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const schoolId = getSchoolId();
      const currentUser = getCurrentUser();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const res = await fetch(`${API_URL}/api/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name,
          email: email || null,
          password,
          role: 'SECRETARY',
          school_id: Number(schoolId),
          requester_id: currentUser?.id,
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to create secretary');
      }
      const data = await res.json();
      const newId = data.unique_id || '';
      setSuccessMsg(`Secretary created! Login ID: ${newId}`);
      setName('');
      setEmail('');
      setPassword('');
      fetchSecretaries();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (sec: SecretaryItem) => {
    setEditingSecretary(sec);
    setEditName(sec.name);
    setEditEmail(sec.email || '');
    setEditPassword('');
    setEditStatus(sec.status || 'active');
    setShowEditPwd(false);
    setError(null);
    setSuccessMsg(null);
  };

  const closeEdit = () => {
    setEditingSecretary(null);
  };

  const handleUpdate = async () => {
    if (!editingSecretary) return;
    if (!editName.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const schoolId = getSchoolId();
      const body: any = {
        name: editName,
        email: editEmail || null,
        role: 'SECRETARY',
        status: editStatus,
        school_id: schoolId ? Number(schoolId) : undefined,
      };
      if (editPassword.trim()) {
        body.password = editPassword;
      }

      const res = await fetch(`${API_URL}/api/users/${editingSecretary.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update secretary');
      }
      setSuccessMsg('Secretary updated successfully!');
      setEditingSecretary(null);
      fetchSecretaries();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this secretary?')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete');
      setSuccessMsg('Secretary deleted');
      fetchSecretaries();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    }
  };

  return (
    <div className="school-teachers-page">
      <h2>Secretaries</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      {/* ---- Create form ---- */}
      <form onSubmit={createSecretary} style={{ marginBottom: 20 }}>
        <h3>Add Secretary</h3>

        <label>Name *</label>
        <input placeholder="Secretary full name" value={name} onChange={e => setName(e.target.value)} required />

        <label>Email (optional)</label>
        <input placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} />

        <label>Password *</label>
        <div style={{ position: 'relative' }}>
          <input
            type={showCreatePwd ? 'text' : 'password'}
            placeholder="Set login password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ paddingRight: 44 }}
          />
          <button
            type="button"
            onClick={() => setShowCreatePwd(!showCreatePwd)}
            style={{
              position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280', padding: 4
            }}
            title={showCreatePwd ? 'Hide' : 'Show'}
          >
            {showCreatePwd ? '🙈' : '👁️'}
          </button>
        </div>
        <small style={{ color: '#dc2626', fontWeight: 600, fontSize: 12 }}>
          ⚠️ Required — the secretary needs this password to log in with their ID.
        </small>

        <div className="form-actions-row" style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Secretary'}
          </button>
        </div>
      </form>

      {/* ---- Existing secretaries table ---- */}
      <h3>Existing Secretaries</h3>
      {!loading && secretaries.length > 0 && (
        <div className="teachers-table-wrap">
          <table className="teachers-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Login ID</th>
                <th>Email</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {secretaries.map((sec) => (
                <tr key={sec.id}>
                  <td style={{ fontWeight: 'bold' }}>{sec.name}</td>
                  <td>
                    {sec.unique_id ? (
                      <span
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534',
                          padding: '3px 10px', borderRadius: 8, fontWeight: 700, fontFamily: 'monospace', fontSize: 13
                        }}
                      >
                        {sec.unique_id}
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(sec.unique_id || '');
                            setSuccessMsg('ID copied!');
                            setTimeout(() => setSuccessMsg(null), 2000);
                          }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0, color: '#166534' }}
                          title="Copy ID"
                        >
                          📋
                        </button>
                      </span>
                    ) : (
                      <span style={{ color: '#999' }}>—</span>
                    )}
                  </td>
                  <td>{sec.email || <span style={{ color: '#999' }}>—</span>}</td>
                  <td>
                    <span className={`role-pill ${sec.status === 'active' ? 'role-teacher' : ''}`} style={sec.status !== 'active' ? { color: '#991b1b', borderColor: 'rgba(153,27,27,0.25)', background: 'rgba(153,27,27,0.08)' } : {}}>
                      {sec.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => openEdit(sec)}
                        style={{
                          background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe',
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          boxShadow: 'none'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sec.id)}
                        style={{
                          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                          padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          boxShadow: 'none'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && secretaries.length === 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>No secretaries yet.</p>
      )}

      {/* ---- Edit Modal ---- */}
      {editingSecretary && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 20
          }}
          onClick={closeEdit}
        >
          <div
            style={{
              background: '#fff', borderRadius: 20, width: '100%', maxWidth: 520,
              maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: 0
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px 0' }}>
              <h3 style={{ margin: 0, fontSize: 20, color: '#111827' }}>✏️ Edit Secretary</h3>
              <button
                onClick={closeEdit}
                style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280', padding: 4, lineHeight: 1 }}
              >
                ×
              </button>
            </div>

            {/* Modal body */}
            <div style={{ padding: '20px 24px 24px' }}>
              {/* Login ID info */}
              {editingSecretary.unique_id && (
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
                  padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#166534'
                }}>
                  <strong>Login ID:</strong>{' '}
                  <code style={{ fontWeight: 700, fontSize: 16 }}>{editingSecretary.unique_id}</code>
                  <br />
                  <small>The secretary uses this ID + password to log in.</small>
                </div>
              )}

              {/* Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Name *</label>
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="Secretary full name"
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Email (optional)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="email@example.com"
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                />
                <small style={{ color: '#9ca3af', fontSize: 12 }}>Email is optional. The secretary logs in with their Login ID.</small>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Password (leave blank to keep current)</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showEditPwd ? 'text' : 'password'}
                    value={editPassword}
                    onChange={e => setEditPassword(e.target.value)}
                    placeholder="Enter new password to change"
                    style={{
                      width: '100%', padding: '10px 14px', paddingRight: 44, border: '1px solid #d1d5db', borderRadius: 10,
                      fontSize: 14, outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPwd(!showEditPwd)}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280', padding: 4
                    }}
                    title={showEditPwd ? 'Hide' : 'Show'}
                  >
                    {showEditPwd ? '🙈' : '👁️'}
                  </button>
                </div>
                <small style={{ color: '#9ca3af', fontSize: 12 }}>Leave blank to keep the current password. Enter a new value to reset it.</small>
              </div>

              {/* Status */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 6 }}>Status</label>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', border: '1px solid #d1d5db', borderRadius: 10,
                    fontSize: 14, outline: 'none', boxSizing: 'border-box'
                  }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  onClick={closeEdit}
                  style={{
                    background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db',
                    padding: '10px 20px', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14,
                    boxShadow: 'none'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={saving}
                  style={{
                    background: 'linear-gradient(135deg, #6a11cb, #2575fc)', color: '#fff', border: 'none',
                    padding: '10px 24px', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 14, opacity: saving ? 0.6 : 1, boxShadow: '0 4px 14px rgba(37,117,252,0.25)'
                  }}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
