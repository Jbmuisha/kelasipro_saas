"use client";
import React, { useEffect, useState } from 'react';
import '@/app/dashboard/admin/admin.css';

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
        <ul>
          {teachers.map((t) => (
            <li key={t.id}>{t.name} {t.email && `(${t.email})`}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
