"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import '@/app/dashboard/school/school.css';

type Teacher = { id: number; name: string; email?: string };

type ClassItem = { id:number; name:string };

type CourseForm = { name: string; description: string; classes: number[] };

export default function SchoolTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
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
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [assistantClassId, setAssistantClassId] = useState<number | null>(null);

  // courses form (for secondary teachers)
  const [courses, setCourses] = useState<CourseForm[]>([{ name: '', description: '', classes: [] }]);
  const [selectedClassIds, setSelectedClassIds] = useState<number[]>([]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers?school_id=${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load teachers');
      const data = await res.json();
      setTeachers(data.teachers || []);
    } catch (err:any) {
      console.error(err);
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolAndClasses = async () => {
    try{
      const schoolId = localStorage.getItem('school_id') || '1';
      console.debug('[teachers] fetching school/type for', schoolId, 'bundleAt', new Date().toISOString());
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/schools/${schoolId}`);
      if(res.ok){
        const sd = await res.json();
        setSchoolType(sd.school_type || null);
      }
      const token = localStorage.getItem('token');
      const cRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token || ''}` } });
      if(cRes.ok){ const cd = await cRes.json(); console.debug('[teachers] classes response', cd); setClassesList(cd.classes || []); }
      else { console.warn('[teachers] classes fetch failed', cRes.status); }
    }catch(err){ console.error(err); }
  }

  // small runtime build marker for detecting stale bundles (will log timestamp)
  useEffect(()=>{ console.debug('[teachers] runtime bundle loaded at', new Date().toISOString()); }, []);

  useEffect(() => {
    fetchTeachers();
    fetchSchoolAndClasses();
  }, []);

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
      // validate teacher-level class selection
      if(role === 'TEACHER'){
        if(!selectedClassIds || selectedClassIds.length===0){
          throw new Error('Please select at least one class for the teacher');
        }
        // if secondary, validate per-course
        if(schoolType && ['secondaire','secondary'].includes(schoolType.toLowerCase())){
          if(!validateCourses()){
            throw new Error('Please fix course errors');
          }
        }
      }

      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';

      const payload:any = { name, email, role, school_id: Number(schoolId) };

      if(role === 'TEACHER'){
        payload.class_ids = selectedClassIds;
        if(schoolType && ['secondaire','secondary'].includes(schoolType.toLowerCase())){
          payload.courses = courses.map(c => ({ name: c.name, description: c.description, classes: c.classes }));
        }
      } else if(role === 'ASSISTANT'){
        // if primary/maternelle, allow attaching to a class
        if(schoolType && ['primaire','maternelle','cycle_fondamental'].includes(schoolType.toLowerCase())){
          if(!assistantClassId) throw new Error('Please select a class for the assistant');
          payload.class_id = assistantClassId;
        }
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(()=>({}));
        throw new Error(body.error || 'Failed to create user');
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
    <div className="school-teachers-page">
      <h2>User creation</h2>
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
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes/`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ school_id: Number(user.school_id), name, created_by: user.id }) });
              const body = await res.json().catch(()=>({}));
              if (!res.ok){ console.warn('Bulk create failed for', name, body); }
            }
            showToast('Created A-F sections', 'success');
            fetchSchoolAndClasses();
          }catch(err:any){ console.error(err); showToast('Bulk create error','error'); }
        }}>Create A-F sections</button>
      </div>

      <form onSubmit={createUser} style={{ marginBottom: 20 }}>
        <h3>Add user</h3>
        <label>Role</label>
        <select value={role} onChange={e=>setRole(e.target.value as any)}>
          <option value="TEACHER">Teacher</option>
          <option value="ASSISTANT">Assistant</option>
        </select>

        {/* Teacher-level class selection (always required for teachers) */}
        {role === 'TEACHER' && (
          <div className="teacher-classes-select">
            <label>Assign to class(es) (required)</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {classesList.length === 0 && <div>No classes found. Create classes first.</div>}
              {classesList.map(cl => (
                <label key={cl.id} style={{ marginRight: 12 }}>
                  <input type="checkbox" checked={selectedClassIds.includes(cl.id)} onChange={() => {
                    setSelectedClassIds(prev => prev.includes(cl.id) ? prev.filter(x=>x!==cl.id) : [...prev, cl.id]);
                  }} /> {cl.name}
                </label>
              ))}
            </div>
          </div>
        )}

        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} required />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />

        {role==='ASSISTANT' && schoolType && ['primaire','maternelle','cycle_fondamental'].includes(schoolType.toLowerCase()) && (
          <div className="assistant-class-select">
            <label>Assign to class</label>
            <select value={assistantClassId ?? ''} onChange={e=>setAssistantClassId(Number(e.target.value) || null)}>
              <option value="">Select class</option>
              {classesList.map(cl => (<option key={cl.id} value={cl.id}>{cl.name}</option>))}
            </select>
          </div>
        )}

        {role==='TEACHER' && schoolType && ['secondaire','secondary'].includes(schoolType.toLowerCase()) && (
          <div className="courses-section">
            <h4>Courses for secondary teacher (required)</h4>
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

        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button type="submit" disabled={creating}>{creating? 'Creating...': (role==='TEACHER' ? 'Create Teacher' : 'Create Assistant')}</button>
          <Link href="/dashboard/school/secretary"><button type="button">Manage Secretary</button></Link>
        </div>
      </form>

      <h3>Existing teachers</h3>
      {!loading && !error && (
        <ul>
          {teachers.map((t:any) => (
            <li key={t.id} style={{ marginBottom: 8 }}>
              <strong>{t.name}</strong> {t.email && `(${t.email})`}
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
