"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';

type ClassItem = {
  id: number;
  name: string;
  main_teacher_id?: number;
  main_teacher_name?: string;
};

type CourseItem = {
  id: number;
  name: string;
  description?: string;
  teacher_id?: number;
  teacher_name?: string;
  class_id?: number;
  class_name?: string;
};

export default function SchoolCoursesPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schoolLevel, setSchoolLevel] = useState<string>('');

  // primaire state
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [coursesByClass, setCoursesByClass] = useState<Record<number, CourseItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // create course form (primaire)
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // secondaire state (reuse existing logic)
  const [secCourses, setSecCourses] = useState<any[]>([]);
  const [secTeachers, setSecTeachers] = useState<any[]>([]);
  const [secClassesList, setSecClassesList] = useState<any[]>([]);
  const [secSelectedClasses, setSecSelectedClasses] = useState<number[]>([]);
  const [secCourseName, setSecCourseName] = useState('');
  const [secCourseDesc, setSecCourseDesc] = useState('');
  const [secCreating, setSecCreating] = useState(false);
  const [secClassBaseFilter, setSecClassBaseFilter] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      const level = (u?.admin_level || localStorage.getItem('school_type') || 'primaire').toLowerCase();
      setSchoolLevel(level);
    }
  }, []);

  // ===================== PRIMAIRE LOGIC =====================

  const fetchPrimaireClasses = async () => {
    if (!currentUser?.school_id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token_backup');
      const level = schoolLevel === 'maternelle' ? 'maternelle' : 'primaire';
      const res = await fetch(`/api/classes?school_id=${currentUser.school_id}&level=${level}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load classes');
      const data = await res.json();
      const list: ClassItem[] = (data.classes || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        main_teacher_id: c.main_teacher_id || null,
        main_teacher_name: c.main_teacher_name || null,
      }));
      setClasses(list);

      // Fetch courses for each class
      const allCourses: Record<number, CourseItem[]> = {};
      const schoolId = currentUser.school_id;
      const coursesRes = await fetch(`/api/schools/${schoolId}/teacher-courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        const courses = coursesData.courses || [];
        // Map courses to their classes
        for (const course of courses) {
          const courseClasses = course.classes || [];
          for (const cc of courseClasses) {
            const classId = cc.class_id;
            if (!allCourses[classId]) allCourses[classId] = [];
            allCourses[classId].push({
              id: course.id,
              name: course.name,
              description: course.description,
              teacher_id: course.teacher_id,
              teacher_name: course.teacher_name,
              class_id: classId,
              class_name: cc.name,
            });
          }
        }
      }
      setCoursesByClass(allCourses);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const createPrimaireCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) { setError('Select a class'); return; }
    if (!courseName.trim()) { setError('Course name required'); return; }
    setCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token_backup');
      const schoolId = currentUser?.school_id;

      // Find the class's main teacher
      const cls = classes.find(c => c.id === selectedClassId);
      const teacherId = cls?.main_teacher_id || null;

      let res = await fetch(`/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: courseName,
          description: courseDesc,
          school_id: Number(schoolId),
          classes: [selectedClassId],
          teacher_id: teacherId,
        }),
      });
      if (res.status === 403) {
        const adminToken = localStorage.getItem('admin_token_backup');
        if (adminToken && adminToken !== token) {
          res = await fetch(`/api/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              name: courseName,
              description: courseDesc,
              school_id: Number(schoolId),
              classes: [selectedClassId],
              teacher_id: teacherId,
            }),
          });
        }
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Failed to create course');
      }
      setSuccessMsg('Course created!');
      setCourseName('');
      setCourseDesc('');
      fetchPrimaireClasses();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setCreating(false);
    }
  };

  // ===================== SECONDAIRE LOGIC =====================

  const fetchSecondaireData = async () => {
    if (!currentUser?.school_id) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token_backup');
      const schoolId = currentUser.school_id;

      const [tRes, cRes, coursesRes] = await Promise.all([
        fetch(`/api/teachers?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/classes?school_id=${schoolId}&level=secondaire`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/schools/${schoolId}/teacher-courses`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (tRes.ok) { const td = await tRes.json(); setSecTeachers(td.teachers || []); }
      if (cRes.ok) {
        const cd = await cRes.json();
        let list = cd.classes || [];
        if (list.length === 0) {
          // fallback: load all classes
          const cRes2 = await fetch(`/api/classes?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` } });
          if (cRes2.ok) { const cd2 = await cRes2.json(); list = cd2.classes || []; }
        }
        setSecClassesList(list);
      }
      if (coursesRes.ok) { const cd = await coursesRes.json(); setSecCourses(cd.courses || []); }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const createSecondaireCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secCourseName.trim()) { setError('Course name required'); return; }
    if (secSelectedClasses.length === 0) { setError('Select at least one class'); return; }
    setSecCreating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token_backup');
      const schoolId = currentUser?.school_id;
      let res = await fetch(`/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: secCourseName,
          description: secCourseDesc,
          school_id: Number(schoolId),
          classes: secSelectedClasses,
        }),
      });
      if (res.status === 403) {
        const adminToken = localStorage.getItem('admin_token_backup');
        if (adminToken && adminToken !== token) {
          res = await fetch(`/api/courses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
            body: JSON.stringify({
              name: secCourseName,
              description: secCourseDesc,
              school_id: Number(schoolId),
              classes: secSelectedClasses,
            }),
          });
        }
      }
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || 'Failed to create course');
      }
      setSuccessMsg('Course created!');
      setSecCourseName('');
      setSecCourseDesc('');
      setSecSelectedClasses([]);
      fetchSecondaireData();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setSecCreating(false);
    }
  };

  // ===================== LOAD DATA =====================

  useEffect(() => {
    if (!currentUser?.school_id) return;
    if (schoolLevel === 'primaire' || schoolLevel === 'maternelle') {
      fetchPrimaireClasses();
    } else {
      fetchSecondaireData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, schoolLevel]);

  // ===================== RENDER =====================

  if (schoolLevel === 'primaire' || schoolLevel === 'maternelle') {
    return <PrimaireCoursesView
      classes={classes}
      coursesByClass={coursesByClass}
      loading={loading}
      error={error}
      successMsg={successMsg}
      selectedClassId={selectedClassId}
      setSelectedClassId={setSelectedClassId}
      courseName={courseName}
      setCourseName={setCourseName}
      courseDesc={courseDesc}
      setCourseDesc={setCourseDesc}
      creating={creating}
      onSubmit={createPrimaireCourse}
      setError={setError}
      setSuccessMsg={setSuccessMsg}
      level={schoolLevel}
    />;
  }

  return <SecondaireCoursesView
    courses={secCourses}
    classesList={secClassesList}
    teachers={secTeachers}
    loading={loading}
    error={error}
    successMsg={successMsg}
    selectedClasses={secSelectedClasses}
    setSelectedClasses={setSecSelectedClasses}
    courseName={secCourseName}
    setCourseName={setSecCourseName}
    courseDesc={secCourseDesc}
    setCourseDesc={setSecCourseDesc}
    creating={secCreating}
    onSubmit={createSecondaireCourse}
    classBaseFilter={secClassBaseFilter}
    setClassBaseFilter={setSecClassBaseFilter}
    setError={setError}
    setSuccessMsg={setSuccessMsg}
  />;
}

// =====================================================================
//  PRIMAIRE COURSES VIEW
// =====================================================================
function PrimaireCoursesView({
  classes, coursesByClass, loading, error, successMsg,
  selectedClassId, setSelectedClassId,
  courseName, setCourseName, courseDesc, setCourseDesc,
  creating, onSubmit, setError, setSuccessMsg, level,
}: {
  classes: ClassItem[];
  coursesByClass: Record<number, CourseItem[]>;
  loading: boolean;
  error: string | null;
  successMsg: string | null;
  selectedClassId: number | null;
  setSelectedClassId: (v: number | null) => void;
  courseName: string;
  setCourseName: (v: string) => void;
  courseDesc: string;
  setCourseDesc: (v: string) => void;
  creating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  setError: (v: string | null) => void;
  setSuccessMsg: (v: string | null) => void;
  level: string;
}) {
  const levelLabel = level === 'maternelle' ? 'Maternelle' : 'Primaire';

  return (
    <div className="school-teachers-page">
      <h2>Courses ({levelLabel})</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        In {levelLabel.toLowerCase()}, each class has one main teacher. Courses are created per class and automatically assigned to the class&apos;s teacher.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      {/* Create course form */}
      <form onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <h3>Add Course to a Class</h3>

        <label>Select Class *</label>
        <select
          value={selectedClassId ?? ''}
          onChange={e => setSelectedClassId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">-- Choose a class --</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} {c.main_teacher_name ? `(Prof: ${c.main_teacher_name})` : '(No teacher assigned)'}
            </option>
          ))}
        </select>

        {selectedClassId && (() => {
          const cls = classes.find(c => c.id === selectedClassId);
          if (!cls) return null;
          return (
            <div style={{
              background: cls.main_teacher_name ? '#f0fdf4' : '#fef3c7',
              border: `1px solid ${cls.main_teacher_name ? '#bbf7d0' : '#fde68a'}`,
              borderRadius: 10, padding: '10px 14px', margin: '10px 0', fontSize: 13,
              color: cls.main_teacher_name ? '#166534' : '#92400e',
            }}>
              {cls.main_teacher_name ? (
                <>👤 Teacher: <strong>{cls.main_teacher_name}</strong> — course will be auto-assigned to this teacher.</>
              ) : (
                <>⚠️ No main teacher assigned to this class yet. You can still create the course and assign a teacher later from the Classes page.</>
              )}
            </div>
          );
        })()}

        <label>Course Name *</label>
        <input
          value={courseName}
          onChange={e => setCourseName(e.target.value)}
          placeholder="e.g. Mathématiques, Français, Sciences..."
          required
        />

        <label>Description (optional)</label>
        <input
          value={courseDesc}
          onChange={e => setCourseDesc(e.target.value)}
          placeholder="Brief description"
        />

        <div className="form-actions-row" style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="submit" disabled={creating || !selectedClassId}>
            {creating ? 'Creating...' : 'Create Course'}
          </button>
        </div>
      </form>

      {/* Courses listed by class */}
      <h3>Courses by Class</h3>
      {classes.length === 0 && !loading && (
        <p style={{ color: '#666', fontSize: 13 }}>No classes found. Create classes first.</p>
      )}

      {classes.map(cls => {
        const courses = coursesByClass[cls.id] || [];
        return (
          <div key={cls.id} style={{
            marginBottom: 16, border: '1px solid rgba(17,24,39,0.08)',
            borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.9)',
            boxShadow: '0 4px 16px rgba(17,24,39,0.04)',
          }}>
            {/* Class header */}
            <div style={{
              background: 'rgba(249,250,251,0.9)', padding: '12px 16px',
              borderBottom: '1px solid rgba(17,24,39,0.06)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8,
            }}>
              <div>
                <strong style={{ fontSize: 15, color: '#111827' }}>{cls.name}</strong>
                {cls.main_teacher_name && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                    👤 {cls.main_teacher_name}
                  </span>
                )}
                {!cls.main_teacher_name && (
                  <span style={{ marginLeft: 12, fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                    No teacher
                  </span>
                )}
              </div>
              <span style={{
                fontSize: 12, fontWeight: 700, color: '#6b7280',
                background: '#f3f4f6', padding: '3px 10px', borderRadius: 999,
              }}>
                {courses.length} course{courses.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Courses list */}
            {courses.length > 0 ? (
              <div style={{ padding: 0 }}>
                {courses.map((course, idx) => (
                  <div key={course.id} style={{
                    padding: '10px 16px',
                    borderBottom: idx < courses.length - 1 ? '1px solid rgba(17,24,39,0.04)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6,
                  }}>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{course.name}</span>
                      {course.description && (
                        <span style={{ marginLeft: 8, fontSize: 12, color: '#6b7280' }}>— {course.description}</span>
                      )}
                    </div>
                    {course.teacher_name && (
                      <span style={{ fontSize: 12, color: '#4338ca', fontWeight: 600 }}>
                        {course.teacher_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
                No courses yet for this class.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// =====================================================================
//  SECONDAIRE COURSES VIEW (existing logic preserved)
// =====================================================================
function SecondaireCoursesView({
  courses, classesList, teachers, loading, error, successMsg,
  selectedClasses, setSelectedClasses,
  courseName, setCourseName, courseDesc, setCourseDesc,
  creating, onSubmit, classBaseFilter, setClassBaseFilter,
  setError, setSuccessMsg,
}: {
  courses: any[];
  classesList: any[];
  teachers: any[];
  loading: boolean;
  error: string | null;
  successMsg: string | null;
  selectedClasses: number[];
  setSelectedClasses: (v: number[] | ((prev: number[]) => number[])) => void;
  courseName: string;
  setCourseName: (v: string) => void;
  courseDesc: string;
  setCourseDesc: (v: string) => void;
  creating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  classBaseFilter: string;
  setClassBaseFilter: (v: string) => void;
  setError: (v: string | null) => void;
  setSuccessMsg: (v: string | null) => void;
}) {
  const baseOrder = [
    '7eme secondaire', '8eme secondaire',
    '1ere secondaire', '2eme secondaire', '3eme secondaire', '4eme secondaire',
  ];
  const normalize = (s: string) => (s || '').trim().toLowerCase();
  const baseOf = (name: string) => {
    const n = normalize(name);
    return baseOrder.find(b => n.startsWith(normalize(b))) || 'Other';
  };

  return (
    <div className="school-teachers-page">
      <h2>Courses (Secondaire)</h2>
      <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>
        In secondaire, courses can span multiple classes and are assigned to specific teachers.
      </p>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      <form onSubmit={onSubmit} style={{ marginBottom: 20 }}>
        <h3>Create Course</h3>

        <label>Classes (select multiple)</label>
        {classesList.length === 0 ? (
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            No classes available. Create classes first.
          </div>
        ) : (
          <>
            <label style={{ marginTop: 10 }}>Filter by base class</label>
            <select
              value={classBaseFilter}
              onChange={e => { setClassBaseFilter(e.target.value); setSelectedClasses([]); }}
            >
              <option value="">All</option>
              {baseOrder.map(b => <option key={b} value={b}>{b}</option>)}
            </select>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginTop: 10, maxHeight: 250, overflowY: 'auto' }}>
              {(() => {
                const filtered = classBaseFilter
                  ? classesList.filter((cl: any) => baseOf(cl.name) === classBaseFilter)
                  : classesList;

                const groups: Record<string, any[]> = {};
                for (const cl of filtered) {
                  const base = baseOf(cl.name);
                  groups[base] = groups[base] || [];
                  groups[base].push({ id: Number(cl.id), name: cl.name });
                }

                const groupKeys = Object.keys(groups).sort((a, b) => {
                  const ia = baseOrder.indexOf(a);
                  const ib = baseOrder.indexOf(b);
                  if (ia === -1 && ib === -1) return a.localeCompare(b);
                  if (ia === -1) return 1;
                  if (ib === -1) return -1;
                  return ia - ib;
                });

                return groupKeys.map(g => (
                  <div key={g} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4, color: '#333' }}>{g}</div>
                    {groups[g].sort((x, y) => x.name.localeCompare(y.name)).map(cl => (
                      <label key={cl.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cl.id)}
                          onChange={() => {
                            setSelectedClasses((prev: number[]) =>
                              prev.includes(cl.id) ? prev.filter((x: number) => x !== cl.id) : [...prev, cl.id]
                            );
                          }}
                        />
                        {cl.name}
                      </label>
                    ))}
                  </div>
                ));
              })()}
            </div>
            {selectedClasses.length > 0 && (
              <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>
                Selected: <strong>{selectedClasses.length}</strong> class(es)
              </div>
            )}
          </>
        )}

        <label>Course name</label>
        <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Course name" />

        <label>Description</label>
        <input value={courseDesc} onChange={e => setCourseDesc(e.target.value)} placeholder="Brief description" />

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={creating}>{creating ? 'Creating...' : 'Create Course'}</button>
        </div>
      </form>

      <h3>Existing Courses</h3>
      {!loading && courses.length > 0 && (
        <div className="teachers-table-wrap">
          <table className="teachers-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Course Name</th>
                <th>Description</th>
                <th>Teacher</th>
                <th>Classes</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c: any) => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td style={{ fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ color: '#666' }}>{c.description || '-'}</td>
                  <td>
                    {c.teacher_name || (c.teacher_id ? `Teacher #${c.teacher_id}` : <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>)}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {c.classes && c.classes.length > 0
                      ? c.classes.map((cl: any) => cl.name).join(', ')
                      : <span style={{ color: '#999' }}>None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && courses.length === 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>No courses created yet.</p>
      )}
    </div>
  );
}
