"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';
import { getApiBase } from '@/utils/apiBase';

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
  const [classBaseFilter, setClassBaseFilter] = useState<string>('');
  const [courseName, setCourseName] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string|null>(null);
  const [debugInfo, setDebugInfo] = useState<{ schoolId: string; level: string; classesUrl: string } | null>(null);

  const fetchCourses = async () => {
    setLoading(true);
    try{
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const schoolId = String(user?.school_id || localStorage.getItem('school_id') || '1');
      const res = await fetch(`/api/schools/${schoolId}/teacher-courses`, { headers: { Authorization: `Bearer ${token}` }});
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
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const schoolId = String(user?.school_id || localStorage.getItem('school_id') || '1');

      // Courses page is for secondary workflow.
      // Prefer admin_level, otherwise force 'secondaire' so we always load secondary classes.
      const level = String(user?.admin_level || localStorage.getItem('school_type') || 'secondaire').trim() || 'secondaire';

      console.debug('[courses] fetchTeachersAndClasses', { schoolId, level, apiBase: getApiBase() });

      // Use Next.js API routes as proxy (no CORS issues).
      const classesUrl = `/api/classes?school_id=${schoolId}&level=${encodeURIComponent(level)}`;
      setDebugInfo({ schoolId, level, classesUrl });

      const [tRes, cRes] = await Promise.all([
        fetch(`/api/teachers?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` }}),
        fetch(classesUrl, { headers: { Authorization: `Bearer ${token}` }})
      ]);

      if(tRes.ok){ const td = await tRes.json(); setTeachers(td.teachers || []); }
      if (cRes.ok) {
        const cd = await cRes.json();
        const list = cd.classes || [];
        setClassesList(list);

        // If level-filtered request returns empty but we know classes exist,
        // fall back to unfiltered classes for this school.
        if (Array.isArray(list) && list.length === 0) {
          try {
            const cRes2 = await fetch(`/api/classes?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` }});
            if (cRes2.ok) {
              const cd2 = await cRes2.json();
              setClassesList(cd2.classes || []);
            }
          } catch (e) {
            // ignore
          }
        }
      }

      if (!cRes.ok) {
        const body = await cRes.json().catch(() => ({}));
        console.warn('[courses] classes fetch failed', cRes.status, body);
      }
    }catch(err){ console.error(err); }
  }

  useEffect(()=>{ fetchCourses(); fetchTeachersAndClasses(); },[]);

  const toggleClass = (id:number) => {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  const createCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    // Teacher is optional in this UI; courses can be created for classes without assigning a teacher here.
    if(!courseName.trim()) return setError('Course name required');
    if(!selectedClasses || selectedClasses.length === 0) return setError('Select at least one class');
    setCreating(true); setError(null); setSuccessMsg(null);
    try{
      const token = localStorage.getItem('token');
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      const schoolId = String(user?.school_id || localStorage.getItem('school_id') || '1');

      // Create course via Next.js proxy route.
      const res = await fetch(`/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: courseName, description: courseDesc, school_id: Number(schoolId), classes: selectedClasses })
      });
      if(!res.ok){ const b = await res.json().catch(()=>({})); throw new Error(b.error || 'Failed to create course'); }
      await res.json();
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
      {debugInfo && (
        <div style={{ fontSize: 12, color: '#666', margin: '6px 0 12px' }}>
          <div>School ID used: <strong>{debugInfo.schoolId}</strong></div>
          <div>Level used: <strong>{debugInfo.level}</strong></div>
          <div>Classes API: <code>{debugInfo.classesUrl}</code></div>
        </div>
      )}

      <form onSubmit={createCourse} style={{ marginBottom: 20 }}>
        <h3>Create Course</h3>

        <label>Classes (select multiple)</label>
        {classesList.length === 0 ? (
          <div style={{ fontSize: 12, color: '#666', marginTop: 6 }}>
            No classes available for your level yet. Create classes first in the Classes page.
          </div>
        ) : (
          <>
            <label style={{ marginTop: 10 }}>Filter by base class</label>
            <select
              value={classBaseFilter}
              onChange={(e) => {
                setClassBaseFilter(e.target.value);
                setSelectedClasses([]);
              }}
              style={{ width: '100%', padding: 10, borderRadius: 10, border: '1px solid #e2e8f0' }}
            >
              <option value="">All</option>
              <option value="7eme secondaire">7eme secondaire</option>
              <option value="8eme secondaire">8eme secondaire</option>
              <option value="1ere secondaire">1ere secondaire</option>
              <option value="2eme secondaire">2eme secondaire</option>
              <option value="3eme secondaire">3eme secondaire</option>
              <option value="4eme secondaire">4eme secondaire</option>
            </select>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 10, marginTop: 10, maxHeight: 250, overflowY: 'auto' }}>
              {(() => {
                const baseOrder = [
                  '7eme secondaire',
                  '8eme secondaire',
                  '1ere secondaire',
                  '2eme secondaire',
                  '3eme secondaire',
                  '4eme secondaire',
                ];

                const normalize = (s: string) => (s || '').trim().toLowerCase();
                const baseOf = (name: string) => {
                  const n = normalize(name);
                  const found = baseOrder.find(b => n.startsWith(normalize(b)));
                  return found || 'Other';
                };

                const filtered = classBaseFilter
                  ? classesList.filter(cl => baseOf(cl.name) === classBaseFilter)
                  : classesList;

                const groups: Record<string, { id: number; name: string }[]> = {};
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

                return groupKeys.map((g) => (
                  <div key={g} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 4, color: '#333' }}>{g}</div>
                    {groups[g]
                      .sort((x, y) => x.name.localeCompare(y.name))
                      .map((cl) => (
                        <label key={cl.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedClasses.includes(cl.id)}
                            onChange={() => {
                              setSelectedClasses(prev =>
                                prev.includes(cl.id)
                                  ? prev.filter(x => x !== cl.id)
                                  : [...prev, cl.id]
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
        <input value={courseName} onChange={e=>setCourseName(e.target.value)} placeholder="Course name" />

        <label>Description</label>
        <textarea value={courseDesc} onChange={e=>setCourseDesc(e.target.value)} />

        {/* Teacher selection removed: courses are created per class selection and can belong to multiple classes. */}

        <div style={{ marginTop: 8 }}>
          <button type="submit" disabled={creating}>{creating? 'Creating...':'Create Course'}</button>
        </div>
      </form>

      <h3>Existing Courses</h3>
      {!loading && !error && courses.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: '#f7f7f7', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>ID</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Course Name</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Description</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Teacher</th>
                <th style={{ padding: '8px 12px', borderBottom: '2px solid #e2e8f0' }}>Classes</th>
              </tr>
            </thead>
            <tbody>
              {courses.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 12px' }}>{c.id}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 'bold' }}>{c.name}</td>
                  <td style={{ padding: '8px 12px', color: '#666' }}>{c.description || '-'}</td>
                  <td style={{ padding: '8px 12px' }}>
                    {c.teacher_name || (c.teacher_id ? `Teacher #${c.teacher_id}` : <span style={{ color: '#999', fontStyle: 'italic' }}>Not assigned</span>)}
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>
                    {c.classes && c.classes.length > 0
                      ? c.classes.map(cl => cl.name).join(', ')
                      : <span style={{ color: '#999' }}>None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && courses.length === 0 && (
        <p style={{ color: '#666', fontSize: 13 }}>No courses created yet.</p>
      )}
    </div>
  );
}
