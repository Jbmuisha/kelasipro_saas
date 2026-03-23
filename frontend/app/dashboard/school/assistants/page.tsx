"use client";
import React, { useState } from 'react';
import '@/app/dashboard/school/school.css';

export default function AssistantsPage(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);
  const [success, setSuccess] = useState<string|null>(null);

  const createAssistant = async () => {
    setLoading(true); setError(null); setSuccess(null);
    try{
      const token = localStorage.getItem('token');
      const schoolId = localStorage.getItem('school_id') || '1';
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/teachers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, email, role: 'ASSISTANT', school_id: Number(schoolId) })
      });
      if(!res.ok){ const b = await res.json().catch(()=>({})); throw new Error(b.error || 'Failed'); }
      setSuccess('Assistant created'); setName(''); setEmail('');
    }catch(err:any){ console.error(err); setError(err.message || 'Error'); }
    finally{ setLoading(false); }
  }

  return (
    <div className="assistant-page">
      <h2>Add Assistant</h2>
      {error && <p style={{color:'red'}}>{error}</p>}
      {success && <p style={{color:'green'}}>{success}</p>}
      <div style={{display:'flex',flexDirection:'column',gap:8,maxWidth:400}}>
        <input placeholder="Name" value={name} onChange={e=>setName(e.target.value)} />
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <button onClick={createAssistant} disabled={loading}>{loading? 'Creating...':'Create Assistant'}</button>
      </div>
    </div>
  );
}
