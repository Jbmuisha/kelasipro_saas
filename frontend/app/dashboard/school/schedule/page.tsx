"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const DAYS = [
  { value: 1, label: 'Lundi' },
  { value: 2, label: 'Mardi' },
  { value: 3, label: 'Mercredi' },
  { value: 4, label: 'Jeudi' },
  { value: 5, label: 'Vendredi' },
  { value: 6, label: 'Samedi' },
];

type ClassItem = { id: number; name: string; main_teacher_id?: number; main_teacher_name?: string };
type CourseItem = { id: number; name: string };
type ScheduleItem = {
  id: number; class_id: number; class_name: string; course_id?: number;
  teacher_id?: number; teacher_name?: string; day_of_week: number;
  start_time: string; end_time: string; course_name?: string; display_course_name?: string;
};

export default function SchoolSchedulePage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form
  const [formDay, setFormDay] = useState(1);
  const [formStart, setFormStart] = useState('08:00');
  const [formEnd, setFormEnd] = useState('09:00');
  const [formCourseId, setFormCourseId] = useState<number | null>(null);
  const [formCourseName, setFormCourseName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const fetchClasses = async () => {
    if (!currentUser?.school_id) return;
    try {
      const token = localStorage.getItem('token');
      const level = (currentUser?.admin_level || localStorage.getItem('school_type') || 'primaire').toLowerCase();
      const res = await fetch(`${API_URL}/api/classes/?school_id=${currentUser.school_id}&level=${level}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setClasses((data.classes || []).map((c: any) => ({
          id: c.id, name: c.name,
          main_teacher_id: c.main_teacher_id || null,
          main_teacher_name: c.main_teacher_name || null,
        })));
      }
    } catch (err) { console.error(err); }
  };

  const fetchCoursesForClass = async (classId: number) => {
    if (!currentUser?.school_id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/schools/${currentUser.school_id}/teacher-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const allCourses = data.courses || [];
        // Filter courses that belong to this class
        const classCourses: CourseItem[] = [];
        for (const c of allCourses) {
          const cc = c.classes || [];
          if (cc.some((cl: any) => cl.class_id === classId)) {
            classCourses.push({ id: c.id, name: c.name });
          }
        }
        setCourses(classCourses);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSchedules = async (classId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/schedules?class_id=${classId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSchedules(data.schedules || []);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (currentUser?.school_id) fetchClasses();
  }, [currentUser]);

  useEffect(() => {
    if (selectedClassId) {
      fetchCoursesForClass(selectedClassId);
      fetchSchedules(selectedClassId);
    } else {
      setCourses([]);
      setSchedules([]);
    }
  }, [selectedClassId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) { setError('Select a class'); return; }
    if (!formCourseName.trim() && !formCourseId) { setError('Select a course or enter a name'); return; }
    setCreating(true); setError(null); setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token');
      const cls = classes.find(c => c.id === selectedClassId);
      const res = await fetch(`${API_URL}/api/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          school_id: currentUser?.school_id,
          class_id: selectedClassId,
          course_id: formCourseId || null,
          teacher_id: cls?.main_teacher_id || null,
          day_of_week: formDay,
          start_time: formStart,
          end_time: formEnd,
          course_name: formCourseId ? null : formCourseName,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Failed');
      }
      setSuccessMsg('Schedule entry added!');
      setFormCourseName('');
      setFormCourseId(null);
      fetchSchedules(selectedClassId);
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally { setCreating(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this schedule entry?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/schedules/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedClassId) fetchSchedules(selectedClassId);
      setSuccessMsg('Deleted');
    } catch (err: any) { setError(err.message); }
  };

  // Group schedules by day
  const schedulesByDay: Record<number, ScheduleItem[]> = {};
  for (const s of schedules) {
    if (!schedulesByDay[s.day_of_week]) schedulesByDay[s.day_of_week] = [];
    schedulesByDay[s.day_of_week].push(s);
  }
  // Sort each day by start_time
  for (const day of Object.keys(schedulesByDay)) {
    schedulesByDay[Number(day)].sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const selectedClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="school-teachers-page">
      <h2>📅 Horaire des Cours</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        Assign course schedules per class. The teacher is automatically the class&apos;s main teacher.
      </p>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      {/* Class selector */}
      <div style={{ marginBottom: 20 }}>
        <label>Select Class</label>
        <select
          value={selectedClassId ?? ''}
          onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- Choose a class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.main_teacher_name ? `(Prof: ${c.main_teacher_name})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedClassId && (
        <>
          {/* Add schedule form */}
          <form onSubmit={handleCreate} style={{ marginBottom: 24 }}>
            <h3>Add Time Slot</h3>

            {selectedClass?.main_teacher_name && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 14px', marginBottom: 12, fontSize: 13, color: '#166534' }}>
                👤 Teacher: <strong>{selectedClass.main_teacher_name}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label>Day *</label>
                <select value={formDay} onChange={e => setFormDay(Number(e.target.value))}>
                  {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>
              <div>
                <label>Course</label>
                {courses.length > 0 ? (
                  <select value={formCourseId ?? ''} onChange={e => {
                    const v = e.target.value;
                    setFormCourseId(v ? Number(v) : null);
                    if (v) setFormCourseName('');
                  }}>
                    <option value="">-- or type below --</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                ) : (
                  <input value={formCourseName} onChange={e => setFormCourseName(e.target.value)} placeholder="Course name" />
                )}
                {courses.length > 0 && !formCourseId && (
                  <input value={formCourseName} onChange={e => { setFormCourseName(e.target.value); setFormCourseId(null); }} placeholder="Or type custom name" style={{ marginTop: 6 }} />
                )}
              </div>
              <div>
                <label>Start Time *</label>
                <input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} required />
              </div>
              <div>
                <label>End Time *</label>
                <input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} required />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button type="submit" disabled={creating}>{creating ? 'Adding...' : 'Add to Schedule'}</button>
            </div>
          </form>

          {/* Schedule timetable */}
          <h3>Weekly Schedule — {selectedClass?.name}</h3>
          {schedules.length === 0 ? (
            <p style={{ color: '#666', fontSize: 13 }}>No schedule entries yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              {DAYS.map(day => {
                const daySchedules = schedulesByDay[day.value] || [];
                if (daySchedules.length === 0) return null;
                return (
                  <div key={day.value} style={{
                    marginBottom: 14, border: '1px solid rgba(17,24,39,0.08)',
                    borderRadius: 14, overflow: 'hidden', background: '#fff',
                  }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #6a11cb, #2575fc)', color: '#fff',
                      padding: '10px 16px', fontWeight: 700, fontSize: 14,
                    }}>
                      {day.label}
                    </div>
                    {daySchedules.map(s => (
                      <div key={s.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '10px 16px', borderBottom: '1px solid rgba(17,24,39,0.04)',
                        flexWrap: 'wrap', gap: 8,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{
                            fontFamily: 'monospace', fontSize: 13, fontWeight: 700,
                            color: '#4338ca', background: '#eef2ff', padding: '3px 8px', borderRadius: 6,
                          }}>
                            {s.start_time?.slice(0, 5)} - {s.end_time?.slice(0, 5)}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>
                            {s.display_course_name || s.course_name || '—'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {s.teacher_name && (
                            <span style={{ fontSize: 12, color: '#16a34a' }}>👤 {s.teacher_name}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDelete(s.id)}
                            style={{
                              background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
                              fontWeight: 600, boxShadow: 'none',
                            }}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
