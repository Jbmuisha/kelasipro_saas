"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/admin/admin.css';
import { setImpersonation } from '@/utils/auth';

type Teacher = {
  id: number;
  name: string;
  email?: string;
  role?: string;
  profile_image?: string;
};

export default function AdminTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    fetchTeachers();
  }, []);

  return (
    <div className="admin-teachers-page">
      <h2>Teachers</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && !error && (
        <div style={{ display: 'grid', gap: 12 }}>
          {teachers.map((t) => (
            <div key={t.id} style={{ padding: 16, border: '1px solid #e5e7eb', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{t.name}</div>
                {t.email && <div style={{ fontSize: 14, color: '#6b7280' }}>{t.email}</div>}
              </div>
              <button
                onClick={async () => {
                  if (confirm('Login as ' + t.name + '?')) {
                    await setImpersonation({ id: t.id, role: t.role || 'TEACHER' });
                  }
                }}
                style={{
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(59,130,246,0.3)'
                }}
              >
                👑 Login As
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
