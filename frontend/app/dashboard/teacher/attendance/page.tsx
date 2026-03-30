"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/teacher/teacher.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type StudentRow = {
  id: number;
  name: string;
  unique_id?: string;
  profile_image?: string;
  status: string | null; // null = not yet marked
};

type ScheduleItem = {
  id: number; day_of_week: number; start_time: string; end_time: string;
  display_course_name?: string; course_name?: string; class_name?: string;
};

const DAYS_FR = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export default function TeacherAttendancePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [classId, setClassId] = useState<number | null>(null);
  const [className, setClassName] = useState('');

  // Schedule
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      if (u.class_id) setClassId(u.class_id);
    }
  }, []);

  // Fetch teacher's class info
  const fetchClassInfo = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('token');
      // Try to find the class where this teacher is main_teacher
      const schoolId = currentUser.school_id;
      if (!schoolId) return;
      const res = await fetch(`${API_URL}/api/classes/?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const cls = (data.classes || []).find((c: any) => c.main_teacher_id === currentUser.id);
        if (cls) {
          setClassId(cls.id);
          setClassName(cls.name);
        } else if (currentUser.class_id) {
          // Fallback to user's class_id
          const found = (data.classes || []).find((c: any) => c.id === currentUser.class_id);
          if (found) { setClassId(found.id); setClassName(found.name); }
        }
      }
    } catch (err) { console.error(err); }
  };

  // Fetch schedule for this teacher
  const fetchSchedule = async () => {
    if (!currentUser?.id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/schedules?teacher_id=${currentUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) { console.error(err); }
  };

  // Fetch attendance for the selected date
  const fetchAttendance = async () => {
    if (!classId || !date) return;
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/attendance?class_id=${classId}&date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setStudents(data.students || []);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    if (currentUser?.id) {
      fetchClassInfo();
      fetchSchedule();
    }
  }, [currentUser]);

  useEffect(() => {
    if (classId && date) fetchAttendance();
  }, [classId, date]);

  const setStudentStatus = (studentId: number, status: string) => {
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, status } : s));
  };

  const markAllPresent = () => {
    setStudents(prev => prev.map(s => ({ ...s, status: 'present' })));
  };

  const saveAttendance = async () => {
    if (!classId || !date) return;
    const records = students
      .filter(s => s.status !== null)
      .map(s => ({ student_id: s.id, status: s.status }));
    if (records.length === 0) { setError('Mark at least one student'); return; }
    setSaving(true); setError(null); setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: currentUser?.school_id,
          class_id: classId,
          date,
          records,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Failed');
      }
      const data = await res.json();
      setSuccessMsg(data.message || 'Saved!');
    } catch (err: any) {
      setError(err.message);
    } finally { setSaving(false); }
  };

  // Today's schedule
  const todayDow = new Date().getDay() || 7; // JS: 0=Sun → 7
  const todaySchedule = schedules.filter(s => s.day_of_week === todayDow);

  const presentCount = students.filter(s => s.status === 'present').length;
  const absentCount = students.filter(s => s.status === 'absent').length;
  const lateCount = students.filter(s => s.status === 'late').length;
  const unmarkedCount = students.filter(s => s.status === null).length;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <h2 style={{ marginBottom: 4 }}>📋 Présence des Élèves</h2>
      {className && <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Classe: <strong>{className}</strong></p>}

      {error && <p style={{ color: 'red', marginBottom: 12 }}>{error}</p>}
      {successMsg && <p style={{ color: 'green', marginBottom: 12 }}>{successMsg}</p>}

      {/* Today's schedule */}
      {todaySchedule.length > 0 && (
        <div style={{
          background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 14,
          padding: 16, marginBottom: 20,
        }}>
          <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#4338ca' }}>
            📅 Horaire du jour — {DAYS_FR[todayDow]}
          </h3>
          {todaySchedule.map(s => (
            <div key={s.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 0' }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#4338ca', fontSize: 13 }}>
                {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
              </span>
              <span style={{ fontWeight: 600 }}>{s.display_course_name || s.course_name || '—'}</span>
              {s.class_name && <span style={{ fontSize: 12, color: '#666' }}>({s.class_name})</span>}
            </div>
          ))}
        </div>
      )}

      {/* Date picker */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <label style={{ fontWeight: 700, fontSize: 14 }}>Date:</label>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: 10, border: '1px solid #d1d5db', fontSize: 14 }}
        />
        <button
          type="button"
          onClick={markAllPresent}
          style={{
            background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0',
            padding: '8px 16px', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}
        >
          ✅ Tous Présents
        </button>
        <button
          type="button"
          onClick={saveAttendance}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #6a11cb, #2575fc)', color: '#fff', border: 'none',
            padding: '8px 20px', borderRadius: 10, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: 13, opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : '💾 Enregistrer'}
        </button>
      </div>

      {/* Summary */}
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            ✅ Présents: {presentCount}
          </span>
          <span style={{ background: '#fee2e2', color: '#991b1b', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            ❌ Absents: {absentCount}
          </span>
          <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
            ⏰ En retard: {lateCount}
          </span>
          {unmarkedCount > 0 && (
            <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '4px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}>
              ⬜ Non marqués: {unmarkedCount}
            </span>
          )}
        </div>
      )}

      {/* Student list */}
      {loading && <p>Loading students...</p>}

      {!loading && !classId && (
        <p style={{ color: '#666' }}>No class assigned to you. Contact your school admin.</p>
      )}

      {!loading && classId && students.length === 0 && (
        <p style={{ color: '#666' }}>No students found in this class.</p>
      )}

      {!loading && students.length > 0 && (
        <div style={{ border: '1px solid rgba(17,24,39,0.08)', borderRadius: 14, overflow: 'hidden', background: '#fff' }}>
          {students.map((s, idx) => (
            <div key={s.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: idx < students.length - 1 ? '1px solid rgba(17,24,39,0.05)' : 'none',
              flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {s.profile_image ? (
                  <img src={s.profile_image} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
                )}
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                  {s.unique_id && <div style={{ fontSize: 11, color: '#9ca3af' }}>ID: {s.unique_id}</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['present', 'absent', 'late', 'excused'] as const).map(status => {
                  const labels: Record<string, string> = { present: '✅', absent: '❌', late: '⏰', excused: '📝' };
                  const colors: Record<string, string> = {
                    present: s.status === status ? '#dcfce7' : '#f9fafb',
                    absent: s.status === status ? '#fee2e2' : '#f9fafb',
                    late: s.status === status ? '#fef3c7' : '#f9fafb',
                    excused: s.status === status ? '#e0e7ff' : '#f9fafb',
                  };
                  const borders: Record<string, string> = {
                    present: s.status === status ? '#bbf7d0' : '#e5e7eb',
                    absent: s.status === status ? '#fecaca' : '#e5e7eb',
                    late: s.status === status ? '#fde68a' : '#e5e7eb',
                    excused: s.status === status ? '#c7d2fe' : '#e5e7eb',
                  };
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setStudentStatus(s.id, status)}
                      title={status}
                      style={{
                        background: colors[status], border: `2px solid ${borders[status]}`,
                        borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 16,
                        transition: 'transform 0.1s',
                        transform: s.status === status ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {labels[status]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
