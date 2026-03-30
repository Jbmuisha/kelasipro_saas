"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const getSchoolId = () => {
    try {
      const userStr = localStorage.getItem('user');
      const u = userStr ? JSON.parse(userStr) : null;
      if (u?.school_id) return String(u.school_id);
    } catch {}
    return localStorage.getItem('school_id') || null;
  };

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
        // Token expired or invalid — force re-login
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
        <label>Role</label>
        <select value={role} onChange={e => setRole(e.target.value as any)}>
          <option value="TEACHER">Teacher</option>
          <option value="ASSISTANT">Assistant</option>
        </select>

        <input placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={creating}>
            {creating ? 'Creating...' : role === 'TEACHER' ? 'Create Teacher' : 'Create Assistant'}
          </button>
          <Link href="/dashboard/school/classes"><button type="button">Go to Classes</button></Link>
          <Link href="/dashboard/school/courses"><button type="button">Manage Courses</button></Link>
        </div>
      </form>

      <h3>Existing teachers & assistants</h3>
      {!loading && teachers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f7f7f7', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Role</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Classes</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Courses</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Assign Course</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{t.name}</td>
                  <td style={{ padding: '8px 12px' }}>{t.email || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ fontSize: 12, color: '#666' }}>{t.role}</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    {t.classes && t.classes.length > 0
                      ? t.classes.map(c => c.name).join(', ')
                      : <span style={{ color: '#999' }}>None</span>}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    {t.courses && t.courses.length > 0
                      ? t.courses.map(c => c.name).join(', ')
                      : <span style={{ color: '#999', fontStyle: 'italic' }}>None</span>}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {t.role === 'TEACHER' && (
                      <div>
                        <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 6, padding: 6, marginBottom: 6 }}>
                          {schoolCourses.length === 0 ? (
                            <span style={{ fontSize: 12, color: '#999' }}>No courses yet</span>
                          ) : (
                            schoolCourses.map(c => {
                              const alreadyAssigned = t.courses?.some(tc => tc.id === c.id);
                              return (
                                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, padding: '2px 0', cursor: 'pointer' }}>
                                  <input
                                    type="checkbox"
                                    checked={(assignCoursesByTeacher[t.id] || []).includes(c.id)}
                                    onChange={() => toggleCourseForTeacher(t.id, c.id)}
                                    disabled={!!alreadyAssigned}
                                  />
                                  <span style={{ color: alreadyAssigned ? '#999' : '#333' }}>
                                    {c.name}
                                    {alreadyAssigned && ' ✓'}
                                    {!alreadyAssigned && c.teacher_name && ` (${c.teacher_name})`}
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
                            disabled={!!assigningByTeacher[t.id]}
                            style={{ fontSize: 12, padding: '4px 10px' }}
                          >
                            {assigningByTeacher[t.id] ? 'Assigning...' : `Assign ${(assignCoursesByTeacher[t.id] || []).length} course(s)`}
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && teachers.length === 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>No teachers or assistants yet.</p>
      )}
    </div>
  );
}
