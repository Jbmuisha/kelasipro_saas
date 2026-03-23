"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';

type Course = { id:number; name:string; description?:string; teacher_id?:number; teacher_name?:string; classes?: {class_id:number; name:string}[] };

type Teacher = { id:number; name:string };
type ClassItem = { id:number; name:string };

export default function SchoolCoursesPage(){
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  // create course form
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classesList, setClassesList] = useState<ClassItem[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string|null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try{
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/schools/${schoolId}/teacher-courses`, { headers: { Authorization: `Bearer ${token}` }});
      if(!res.ok) throw new Error('Failed to load courses');
      const data = await res.json();
      setCourses(data.courses || []);
    }catch(err:any){
      console.error(err);
      setError(err.message || 'Error');
    }finally{setLoading(false);}
  }

  const fetchTeachersAndClasses = async () => {
    try{
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const [tRes, cRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` }}),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/classes?school_id=${schoolId}`)
      ]);
      if(tRes.ok){ const td = await tRes.json(); setTeachers(td.teachers || []); }
      if(cRes.ok){ const cd = await cRes.json(); setClassesList(cd.classes || []); }
    }catch(err){ console.error(err); }
  }

  useEffect(()=>{ fetchCourses(); fetchTeachersAndClasses(); },[]);

  const toggleClass = (id:number) => {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!selectedTeacher) return setError('Select a teacher');
    if(!courseName.trim()) return setError('Course name required');
    setCreating(true); setError(null); setSuccessMsg(null);
    try{
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers/${selectedTeacher}/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: courseName, description: courseDesc, school_id: Number(schoolId), classes: selectedClasses })
      });
      if(!res.ok){ const b = await res.json().catch(()=>({})); throw new Error(b.error || 'Failed to create course'); }
      const d = await res.json();
      setSuccessMsg('Course created');
      setCourseName(''); setCourseDesc(''); setSelectedClasses([]);
      fetchCourses();
    }catch(err:any){ console.error(err); setError(err.message || 'Error'); }
    finally{ setCreating(false); }
  }

  return (
    <div className="school-courses-page">
      <h2>Courses</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}
      {successMsg && <p style={{color:'green'}}>{successMsg}</p>}

      <form onSubmit={createCourse} style={{ marginBottom: 20 }}>
        <h3>Create Course</h3>
        <label>Teacher</label>
        <select value={selectedTeacher ?? ''} onChange={e=>setSelectedTeacher(Number(e.target.value) || null)}>
          <option value="">Select teacher</option>
          {teachers.map(t=> <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <label>Course name</label>
        <input value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="Course name" />
        <label>Description</label>
        <textarea value={courseDesc} onChange={e=>setCourseDesc(e.target.value)} />
        <label>Classes (select multiple)</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {classesList.map(cl => (
            <button key={cl.id} type="button" onClick={()=>toggleClass(Number(cl.id))} style={{ padding: '6px 8px', background: selectedClasses.includes(Number(cl.id)) ? '#ddd' : '#fff' }}>{cl.name}</button>
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={creating}>{creating? 'Creating...':'Create Course'}</button>
        </div>
      </form>

      {!loading && !error && (
        <ul>
          {courses.map(c => (
            <li key={c.id}>
              <strong>{c.name}</strong> - {c.teacher_name || `Teacher ${c.teacher_id}`}<br/>
              {c.description && <span>{c.description}</span>}<br/>
              {c.classes && c.classes.length>0 && (
                <small>Classes: {c.classes.map(cl=>cl.name).join(', ')}</small>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
