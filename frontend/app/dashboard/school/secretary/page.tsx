"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/school/school.css';

type Teacher = { id: number; name: string; email?: string };

export default function SchoolSecretaryPage(){
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create secretary form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchTeachers = async () => {
      setLoading(true);
      try{
        const token = localStorage.getItem('token');
        const schoolId = localStorage.getItem('school_id') || '1';
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers?school_id=${schoolId}`, { headers: { Authorization: `Bearer ${token}` }});
        if(!res.ok) throw new Error('Failed to load teachers');
        const data = await res.json();
        setTeachers(data.teachers || []);
      }catch(err:any){
        console.error(err);
        setError(err.message || 'Error');
      }finally{ setLoading(false); }
    }
    fetchTeachers();
  },[]);

  const createSecretary = async () => {
    if(!name.trim()) return;
    setCreating(true); setError(null); setSuccess(null);
    try{
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, role: 'SECRETARY', school_id: Number(schoolId) })
      });
      if(!res.ok){ const b = await res.json().catch(()=>({})); throw new Error(b.error || 'Failed'); }
      setSuccess('Secretary created'); setName(''); setEmail('');
      // refresh
      const sd = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers?school_id=${localStorage.getItem('school_id') || '1'}`, { headers: { Authorization: `Bearer ${token}` }});
      if(sd.ok){ const d = await sd.json(); setTeachers(d.teachers || []); }
    }catch(err:any){ console.error(err); setError(err.message || 'Error'); }
    finally{ setCreating(false); }
  }

  return (
    <div className="school-secretary-page">
      <h2>Secrétaire</h2>

      <div style={{ display:'flex', gap: 12, marginBottom: 12 }}>
        <div style={{ flex:1 }}>
          <h3>Add Secretary</h3>
          {error && <p style={{color:'red'}}>{error}</p>}
          {success && <p style={{color:'green'}}>{success}</p>}
          <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <button onClick={createSecretary} disabled={creating}>{creating? 'Creating...':'Create Secretary'}</button>
        </div>

        <div style={{ flex:1 }}>
          <h3>Teachers</h3>
          {loading && <p>Loading...</p>}
          {!loading && !error && (
            <ul>
              {teachers.map(t => <li key={t.id}>{t.name} {t.email && `(${t.email})`}</li>)}
            </ul>
          )}
        </div>
      </div>

      <p>Placeholder: add secretary-specific management UI here (assign students, manage attendance...)</p>
    </div>
  )
}
