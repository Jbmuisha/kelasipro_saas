"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/app/dashboard/school/school.css';

type Teacher = { id: number; name: string; email?: string };

type TeacherListItem = Teacher & {
  role?: 'TEACHER' | 'ASSISTANT';
  classes?: { id: number; name: string }[];
  courses?: { id?: number; name: string; classes?: { id: number; name: string }[] }[];
};

type ClassItem = { id:number; name:string };

type CourseForm = { name: string; description: string; classes: number[] };

export default function SchoolTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // common form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'TEACHER'|'ASSISTANT'>('TEACHER');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // school info
  const [schoolType, setSchoolType] = useState<string | null>(null);
  const isSecondary = !!schoolType && ['secondaire', 'secondary'].includes(schoolType.toLowerCase());
  const isPrimary = !!schoolType && ['primaire', 'maternelle'].includes(schoolType.toLowerCase());
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [assistantClassId, setAssistantClassId] = useState<number | null>(null);

  // courses form (for secondary teachers)
  const [courses, setCourses] = useState<CourseForm[]>([{ name: '', description: '', classes: [] }]);

  // UI: keep this page simple (create + list). Advanced assignment is done in Classes.
  const [showAdvanced, setShowAdvanced] = useState(false);

  // NOTE: School admin should only create users here.
  // Class assignment should be done from the Classes page after the teacher exists.

  // kept for backward-compatibility with older code paths; class assignment is not done here
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/$/, '');

  const getSchoolId = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u?.school_id) return String(u.school_id);
      } catch {}
    }
    const sid = localStorage.getItem('school_id');
    if (sid) return sid;
    return null;
  };

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const res = await fetch(`${apiBase}/api/teachers?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401 || res.status === 403) throw new Error('Unauthorized: please login again');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to load teachers');
      }
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err:any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolTypeOnly = async () => {
    // Prefer the UI-selected school type (from sidebar) if present.
    // This avoids confusing the user when the DB value is stale/misconfigured.
    const uiSelected = localStorage.getItem('school_type');
    if (uiSelected) return uiSelected;

    try {
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');
      console.debug('[teachers] fetching school/type for', schoolId, 'bundleAt', new Date().toISOString());

      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/schools/${schoolId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });

      if (res.ok) {
        const sd = await res.json();
        return sd.school_type || null;
      }

      // If the API returns non-2xx, surface a useful message in UI.
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || body.message || `Failed to fetch school (status ${res.status})`);
    } catch (err) {
      console.error(err);
      setError((err as any)?.message || 'Failed to fetch school type');
    }
    return null;
  };

  const fetchClassesIfNeeded = async (st: string | null) => {
    // Only fetch classes if the UI needs them:
    // - assistant assignment for primary/maternelle/cycle_fondamental
    // - secondary teacher courses
    const needsClasses =
      (role === 'ASSISTANT' && !!st && ['primaire','maternelle'].includes(st.toLowerCase())) ||
      (role === 'TEACHER' && !!st && ['secondaire','secondary'].includes(st.toLowerCase()));

    if (!needsClasses) {
      setClassesList([]);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');
      const cRes = await fetch(`${apiBase}/api/classes?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (cRes.status === 401) throw new Error('Unauthorized: please login again');
      if(cRes.ok){
        const cd = await cRes.json();
        console.debug('[teachers] classes response', cd);
        setClassesList(cd.classes || []);
      } else {
        console.warn('[teachers] classes fetch failed', cRes.status);
      }
    } catch (err:any) {
      console.error(err);
      setError(err.message || 'Error');
    }
  }

  // small runtime build marker for detecting stale bundles (will log timestamp)
  useEffect(()=>{ console.debug('[teachers] runtime bundle loaded at', new Date().toISOString()); }, []);

  useEffect(() => {
    fetchTeachers();

    // Keep schoolType in sync with the sidebar selection.
    // localStorage changes do not trigger React re-renders, so we listen to the
    // "storage" event and also poll lightly while the page is open.
    const applyFromLocalStorage = () => {
      const st = localStorage.getItem('school_type');
      if (st) setSchoolType(st);
    };

    applyFromLocalStorage();

    (async () => {
      const st = await fetchSchoolTypeOnly();
      setSchoolType(st);
    })();

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'school_type') applyFromLocalStorage();
    };
    window.addEventListener('storage', onStorage);

    const interval = window.setInterval(applyFromLocalStorage, 1000);

    return () => {
      window.removeEventListener('storage', onStorage);
      window.clearInterval(interval);
    };
  }, []);

  // when role or schoolType changes, fetch classes only if needed
  useEffect(() => {
    if (!showAdvanced) return;
    fetchClassesIfNeeded(schoolType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, schoolType, showAdvanced]);

  // Keep advanced mode aligned with school type:
  // - Secondary: allow advanced (courses UI)
  // - Primary/Maternelle: force advanced OFF (no courses on this page)
  useEffect(() => {
    if (isSecondary) {
      setShowAdvanced(true);
    } else if (isPrimary) {
      setShowAdvanced(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSecondary, isPrimary]);

  const addCourseRow = () => setCourses(prev => [...prev, { name:'', description:'', classes:[] }]);
  const removeCourseRow = (index:number) => setCourses(prev => prev.filter((_,i)=>i!==index));
  const updateCourse = (index:number, field:string, value:any) => {
    setCourses(prev => prev.map((c,i)=> i===index ? { ...c, [field]: value } : c));
  }
  const toggleCourseClass = (courseIndex:number, classId:number) => {
    setCourses(prev => prev.map((c,i)=>{
      if(i!==courseIndex) return c;
      const exists = c.classes.includes(classId);
      return { ...c, classes: exists ? c.classes.filter(x=>x!==classId) : [...c.classes, classId] };
    }));
  }

  const [courseErrors, setCourseErrors] = useState<Record<number,string>>({});
  const [toast, setToast] = useState({ show:false, message:'', type:'success' });
  const showToast = (message:string, type:string='success') => { setToast({ show:true, message, type }); setTimeout(()=>setToast({ show:false, message:'', type:'success' }),3000); };

  const validateCourses = () => {
    const errors: Record<number,string> = {};
    courses.forEach((c, idx) => {
      if(!c.name || !c.name.trim()) errors[idx] = 'Course name is required';
      else if(!c.classes || c.classes.length===0) errors[idx] = 'Select at least one class for this course';
    });
    setCourseErrors(errors);
    return Object.keys(errors).length === 0;
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setSuccessMsg(null);
    setError(null);
    try{
      // For TEACHER creation: keep it simple here.
      // Class assignment is handled in the Classes page.
      if (role === 'TEACHER') {
        // Always re-check school type at submit time to avoid stale/incorrect UI state.
        const st = (await fetchSchoolTypeOnly()) || schoolType;
        if (st) setSchoolType(st);

        const secondary = !!st && ['secondaire', 'secondary'].includes(st.toLowerCase());
        const primary = !!st && ['primaire', 'maternelle'].includes(st.toLowerCase());

        // Primary/Maternelle: never validate courses on this page.
        if (primary) {
          // Ensure advanced is off so we don't accidentally send courses.
          if (showAdvanced) setShowAdvanced(false);
        }

        // Secondary: validate courses only if advanced is enabled.
        if (secondary && showAdvanced) {
          // Ensure we have classes loaded for the course picker.
          await fetchClassesIfNeeded(st);

          if (!validateCourses()) {
            throw new Error('Secondary school: please add at least one course and select at least one class for each course.');
          }
        }
      }

      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');
      const schoolId = getSchoolId();
      if (!schoolId) throw new Error('Missing school_id. Please logout/login again.');

      const payload:any = { name, email, role, school_id: Number(schoolId) };

      if (role === 'TEACHER') {
        // Do not send class_ids from this page.
        // IMPORTANT: use the latest school type we fetched at submit time.
        const st = (await fetchSchoolTypeOnly()) || schoolType;
        if (st) setSchoolType(st);

        const secondary = !!st && ['secondaire', 'secondary'].includes(st.toLowerCase());

        // For secondary schools, send courses only when advanced is enabled.
        // This matches the desired workflow:
        // - Primary: create teacher first, assign class later (no courses here)
        // - Secondary: admin can create teacher first, then add courses later OR enable advanced to add now
        if (secondary && showAdvanced) {
          payload.courses = courses.map(c => ({ name: c.name, description: c.description, classes: c.classes }));
        }

        // Backend requires courses for secondary teachers. If schoolType is missing,
        // do NOT send courses and let the backend decide based on school_id.
      } else if (role === 'ASSISTANT') {
        // if primary/maternelle, allow attaching to a class
        if(schoolType && ['primaire','maternelle'].includes(schoolType.toLowerCase())){
          if(!assistantClassId) throw new Error('Please select a class for the assistant');
          payload.class_id = assistantClassId;
        }
      }

      const res = await fetch(`${apiBase}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (res.status === 401 || res.status === 403) {
        throw new Error('Unauthorized: your account is not allowed to create teachers. Please login as SCHOOL_ADMIN.');
      }
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));

        // If backend thinks this is secondary but UI is primary, show a clearer message.
        if ((body.error || '').includes('Secondary school teachers must have at least one course')) {
          const uiType = localStorage.getItem('school_type');
          if (uiType && ['primaire', 'maternelle'].includes(uiType.toLowerCase())) {
            throw new Error(
              'Your school is configured as SECONDARY on the server, so courses are required. ' +
              'Please switch the school type in Settings (or ask admin) or add courses in Advanced mode.'
            );
          }
        }

        throw new Error(body.error || body.message || 'Failed to create user');
      }
      await res.json();
      setSuccessMsg(role === 'TEACHER' ? 'Teacher created successfully' : 'Assistant created successfully');
      setName(''); setEmail(''); setAssistantClassId(null);
      setCourses([{ name:'', description:'', classes:[] }]);
      setSelectedClassIds([]);
      setCourseErrors({});
      fetchTeachers();
    }catch(err:any){
      console.error(err);
      setError(err.message || 'Error');
    }finally{ setCreating(false); }
  };

  return (
    <div className={`school-teachers-page ${isSecondary ? 'school-teachers--secondary' : isPrimary ? 'school-teachers--primary' : ''}`}>
      <h2>Teachers & Assistants</h2>
      {schoolType && (
        <div style={{ fontSize: 12, color: '#666', margin: '6px 0 12px' }}>
          School type detected: <strong>{schoolType}</strong>
          {isSecondary && (
            <span style={{ marginLeft: 8 }}>
              (Secondary mode: courses required)
            </span>
          )}
          {isPrimary && (
            <span style={{ marginLeft: 8 }}>
              (Primary/Maternelle mode: courses not required)
            </span>
          )}
        </div>
      )}
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      <div style={{ marginBottom: 12 }}>
        <button onClick={async () => {
          const userStr = localStorage.getItem('user');
          if (!userStr) { showToast('No user in localStorage','error'); return; }
          const user = JSON.parse(userStr);
          if (!user.id || !user.school_id) { showToast('Invalid user in localStorage','error'); return; }
          const token = localStorage.getItem('token');
          const st = schoolType || 'primaire';
          const base = st.toLowerCase().includes('second') ? '1ere secondaire' : '1ere primaire';
          const letters = ['A','B','C','D','E','F'];
          try{
            for(const l of letters){
              const name = `${base} ${l}`;
              const res = await fetch(`${apiBase}/api/classes/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` },
                body: JSON.stringify({ school_id: Number(user.school_id), name, created_by: user.id })
              });
              const body = await res.json().catch(()=>({}));
              if (!res.ok){ console.warn('Bulk create failed for', name, body); }
            }
            showToast('Created A-F sections', 'success');
            await fetchSchoolTypeOnly();
            await fetchClassesIfNeeded(schoolType);
          }catch(err:any){ console.error(err); showToast('Bulk create error','error'); }
        }}>Create A-F sections</button>
      </div>

      <form onSubmit={createUser} style={{ marginBottom: 20 }}>
        <h3>Add teacher / assistant</h3>
        <div style={{ margin: '8px 0 12px' }}>
          {/* Advanced is only relevant for secondary schools (courses). */}
          {isSecondary && (
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, color: '#444' }}>
              <input
                type="checkbox"
                checked={showAdvanced}
                disabled={!!schoolType && !['secondaire','secondary','primaire','maternelle'].includes(schoolType.toLowerCase())}
                onChange={(e) => setShowAdvanced(e.target.checked)}
              />
              Advanced (secondary courses / assistant class)
            </label>
          )}

          {schoolType && !['secondaire','secondary'].includes(schoolType.toLowerCase()) && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              School type: {schoolType}. Courses are only required for secondary schools.
            </div>
          )}
          {isSecondary && (
            <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
              School type: {schoolType}. Courses are required for teachers in secondary schools.
            </div>
          )}
        </div>
        <label>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="TEACHER">Teacher</option>
          <option value="ASSISTANT">Assistant</option>
        </select>

        {/* Teacher class assignment is done from the Classes page */}
        {role === 'TEACHER' && (
          <div className="teacher-classes-select">
            <div style={{ fontSize: 13, color: '#444' }}>
              After creating the teacher, go to{' '}
              <Link href="/dashboard/school/classes">Classes</Link>
              {' '}to assign them to a class.
            </div>
          </div>
        )}

        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />

        {showAdvanced && role==='ASSISTANT' && schoolType && ['primaire','maternelle'].includes(schoolType.toLowerCase()) && (
          <div className="assistant-class-select">
            <label>Assign to class</label>
            <select value={assistantClassId ?? ''} onChange={e=>setAssistantClassId(Number(e.target.value) || null)}>
              <option value="">Select class</option>
              {classesList.map(cl => (<option key={cl.id} value={cl.id}>{cl.name}</option>))}
            </select>
          </div>
        )}

        {showAdvanced && role==='TEACHER' && schoolType && ['secondaire','secondary'].includes(schoolType.toLowerCase()) && (
          <div className="courses-section">
            <h4>Courses for secondary teacher</h4>
            {courses.map((c, idx) => (
              <div key={idx} className="course-row">
                <input placeholder="Course name" value={c.name} onChange={e=>updateCourse(idx,'name', e.target.value)} required />
                <input placeholder="Description" value={c.description} onChange={e=>updateCourse(idx,'description', e.target.value)} />
                <div className="classes-picker">
                  {classesList.map(cl => (
                    <label key={cl.id} style={{ marginRight: 8 }}>
                      <input type="checkbox" checked={c.classes.includes(cl.id)} onChange={()=>toggleCourseClass(idx, cl.id)} /> {cl.name}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={()=>removeCourseRow(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={addCourseRow}>Add another course</button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button type="submit" disabled={creating}>{creating? 'Creating...': (role==='TEACHER' ? 'Create Teacher' : 'Create Assistant')}</button>
          <Link href="/dashboard/school/classes"><button type="button">Go to Classes</button></Link>
          <Link href="/dashboard/school/secretary"><button type="button">Manage Secretary</button></Link>
        </div>
      </form>

      <h3>Existing teachers & assistants</h3>
      {!loading && !error && (
        <ul>
          {teachers.map((t:any) => (
            <li key={t.id} style={{ marginBottom: 8 }}>
              <strong>{t.name}</strong> {t.email && `(${t.email})`}
              {t.role && (
                <span style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>
                  [{t.role}]
                </span>
              )}
              {t.classes && t.classes.length > 0 && (
                <div style={{ fontSize: 12, color: '#444' }}>Classes: {t.classes.map((c:any)=>c.name).join(', ')}</div>
              )}
              {t.courses && t.courses.length > 0 && (
                <div style={{ fontSize: 12, color: '#444' }}>
                  Courses: {t.courses.map((c:any)=> `${c.name} (${(c.classes||[]).map((cl:any)=>cl.name).join(', ')})`).join(' ; ')}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
