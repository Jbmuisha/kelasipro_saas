"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, setImpersonation, clearImpersonation } from '@/utils/auth';
import '@/app/dashboard/school/school.css';


type TeacherListItem = {
  id: number;
  name: string;
  email?: string;
  role?: 'TEACHER' | 'ASSISTANT';
  classes?: { id: number; name: string }[];
  courses?: { id?: number; name: string; classes?: { id: number; name: string }[] }[];
};

type CourseItem = { id: number; name: string; teacher_id?: number; teacher_name?: string };

export default function SchoolTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // create form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'TEACHER' | 'ASSISTANT'>('TEACHER');
  const [creating, setCreating] = useState(false);

  // school courses (for assignment)
  const [schoolCourses, setSchoolCourses] = useState<CourseItem[]>([]);
  const [assignCoursesByTeacher, setAssignCoursesByTeacher] = useState<Record<number, number[]>>({});
  const [assigningByTeacher, setAssigningByTeacher] = useState<Record<number, boolean>>({});

  const { user } = useAuth();
  
  const getSchoolId = () => {
    if (user?.school_id) return String(user.school_id);
    return localStorage.getItem('school_id') || null;
  };

  // Auto-clear stale impersonation sessions
  useEffect(() => {
    if (user?.role !== 'SCHOOL_ADMIN' && user?.role !== 'SUPER_ADMIN' && localStorage.getItem('impersonation')) {
      clearImpersonation();
    }
  }, [user]);


  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const res = await fetch(`/api/teachers?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('school_id');
        localStorage.removeItem('school_type');
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to load teachers');
      }
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const schoolId = getSchoolId();
      if (!schoolId) return;
      const res = await fetch(`/api/schools/${schoolId}/teacher-courses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSchoolCourses(data.courses || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSchoolCourses();
  }, []);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setSuccessMsg(null);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const payload: any = { name, email, role, school_id: Number(schoolId) };

      const res = await fetch(`/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error('Unauthorized: please login as SCHOOL_ADMIN.');
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to create user');
      }
      await res.json();
      setSuccessMsg(role === 'TEACHER' ? 'Teacher created successfully' : 'Assistant created successfully');
      setName('');
      setEmail('');
      fetchTeachers();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setCreating(false);
    }
  };

  const toggleCourseForTeacher = (teacherId: number, courseId: number) => {
    setAssignCoursesByTeacher(prev => {
      const current = prev[teacherId] || [];
      return {
        ...prev,
        [teacherId]: current.includes(courseId)
          ? current.filter(id => id !== courseId)
          : [...current, courseId]
      };
    });
  };

  const assignCourses = async (teacherId: number) => {
    const courseIds = assignCoursesByTeacher[teacherId] || [];
    if (courseIds.length === 0) {
      setError('Select at least one course');
      return;
    }
    setAssigningByTeacher(prev => ({ ...prev, [teacherId]: true }));
    setError(null);
    try {
      const token = localStorage.getItem('token');
      for (const courseId of courseIds) {
        const res = await fetch(`/api/courses/${courseId}/assign-teacher`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ teacher_id: teacherId })
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Failed to assign course #${courseId}`);
      }
      setSuccessMsg(`${courseIds.length} course(s) assigned to teacher`);
      setAssignCoursesByTeacher(prev => ({ ...prev, [teacherId]: [] }));
      fetchTeachers();
      fetchSchoolCourses();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setAssigningByTeacher(prev => ({ ...prev, [teacherId]: false }));
    }
  };

  return (
    <div className="school-teachers-page">
      <h2>Teachers & Assistants</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      <form onSubmit={createUser} style={{ marginBottom: 20 }}>
        <h3>Add teacher / assistant</h3>
        <label>Role:</label>
        <select value={role} onChange={e => setRole(e.target.value as 'TEACHER' | 'ASSISTANT')}>
          <option value="TEACHER">Teacher</option>
          <option value="ASSISTANT">Assistant</option>
        </select>

        <input placeholder="Name *" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Email (optional)" value={email} onChange={e => setEmail(e.target.value)} type="email" />

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : role === 'TEACHER' ? 'Create Teacher' : 'Create Assistant'}
          </button>
          <Link href="/dashboard/school/classes"><button type="button">← Classes</button></Link>
          <Link href="/dashboard/school/courses"><button type="button">Courses →</button></Link>
        </div>
      </form>

      <h3>Current teachers & assistants ({teachers.length})</h3>
      {!loading && teachers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <p>No teachers or assistants yet. Create one above!</p>
        </div>
      )}
      {!loading && teachers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb' }}>Name</th>
                <th style={{ padding: '12px 16px', borderRadius: '12px', borderBottom: '2px solid #e5e7eb' }}>Email</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb' }}>Role</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb' }}>Classes</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb' }}>Courses</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{t.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 14 }}>{t.email || <em>-</em>}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ 
                      background: t.role === 'TEACHER' ? '#dbeafe' : '#f0f9ff',
                      color: t.role === 'TEACHER' ? '#1e40af' : '#0e7490',
                      padding: '4px 12px', 
                      borderRadius: '20px', 
                      fontSize: 13, 
                      fontWeight: 600 
                    }}>{t.role || 'TEACHER'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {t.classes?.length ? t.classes.map(c => c.name).join(', ') : <em style={{ color: '#9ca3af' }}>None</em>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>
                    {t.courses?.length ? t.courses.map(c => c.name).join(', ') : <em style={{ color: '#9ca3af' }}>None</em>}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {t.role === 'TEACHER' ? (
                      <>
                        {user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN' ? (
                          <button
                            onClick={async () => setImpersonation({ id: t.id, role: t.role })}
                            style={{
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 16px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                              marginBottom: 8,
                              width: '100%',
                              boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                            }}
                            title="Login as this teacher (admin only)"
                          >
                            👑 Login As
                          </button>
                        ) : (
                          <button disabled style={{ opacity: 0.5, cursor: 'not-allowed', background: '#9ca3af', width: '100%', borderRadius: 8, padding: '8px 16px', fontSize: 13, border: 'none' }}>
                            Impersonate (Admin Only)
                          </button>
                        )}


                        <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, padding: 8 }}>
                          {schoolCourses.length === 0 ? (
                            <span style={{ fontSize: 13, color: '#9ca3af' }}>No courses available</span>
                          ) : (
                            schoolCourses.map((c) => {
                              const alreadyAssigned = t.courses?.some((tc) => tc.id === c.id);
                              return (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '4px 0', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={(assignCoursesByTeacher[t.id] || []).includes(c.id)}
                                    onChange={() => toggleCourseForTeacher(t.id, c.id)}
                                    disabled={alreadyAssigned}
                                  />
                                  <span style={{ 
                                    color: alreadyAssigned ? '#9ca3af' : '#374151',
                                    fontWeight: alreadyAssigned ? 'normal' : '500' 
                                  }}>
                                    {c.name}
                                    {alreadyAssigned && ' ✓ Assigned'}
                                    {!alreadyAssigned && c.teacher_name && ` (current: ${c.teacher_name})`}
                                    {!alreadyAssigned && !c.teacher_name && ' (unassigned)'}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                        {(assignCoursesByTeacher[t.id] || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => assignCourses(t.id)}
                            disabled={assigningByTeacher[t.id]}
                            style={{ 
                              fontSize: 13, 
                              padding: '6px 12px', 
                              marginTop: 8, 
                              width: '100%',
                              background: assigningByTeacher[t.id] ? '#9ca3af' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: 6,
                              cursor: assigningByTeacher[t.id] ? 'not-allowed' : 'pointer'
                            }}
                          >
                            {assigningByTeacher[t.id] ? 'Assigning...' : `Assign ${ (assignCoursesByTeacher[t.id] || []).length } course(s)`}
                          </button>
                        )}
                      </>
                    ) : (
                      <span style={{ fontSize: 13, color: '#9ca3af' }}>N/A (Assistant)</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && teachers.length === 0 && (
        <p style={{ color: '#666', fontSize: 13, textAlign: 'center' }}>No teachers or assistants yet. Create one above!</p>
      )}
    </div>
  );
}
