"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/utils/auth';
// Component for admin to manage students in primaire and secondaire schools

type Student = {
  id: number;
  name: string;
  email?: string;
  role?: string;
  profile_image?: string;
  school_id?: number;
  school_name?: string;
  school_type?: string;
  class_id?: number;
  class_name?: string;
  class_level?: string;
  parents?: { id: number; name: string; email?: string }[];
};

const getSchoolType = (student: Student) => {
  return student.school_type || 'Unknown';
};

type SortField = 'name' | 'email' | 'school_name' | 'class_name';
type SortOrder = 'asc' | 'desc';

export default function AdminStudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filter, setFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const fetchStudents = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Unauthorized: please login again');

      const res = await fetch('/api/users?role=STUDENT', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('school_id');
        localStorage.removeItem('school_type');
        window.location.href = '/login';
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || body.message || 'Failed to load students');
      }

      const data = await res.json();
      setStudents(data.users || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error loading students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  // Filter students from primaire and secondaire schools only
  const primaireSecondaireStudents = useMemo(() => {
    return students.filter(s => {
      const schoolType = getSchoolType(s);
      return schoolType === 'primaire' || schoolType === 'secondaire';
    });
  }, [students]);

  // Apply filtering
  const filteredStudents = useMemo(() => {
    if (!filter) return primaireSecondaireStudents;
    const lowerFilter = filter.toLowerCase();
    return primaireSecondaireStudents.filter(s => 
      s.name.toLowerCase().includes(lowerFilter) ||
      (s.email && s.email.toLowerCase().includes(lowerFilter)) ||
      (s.school_name && s.school_name.toLowerCase().includes(lowerFilter)) ||
      (s.class_name && s.class_name.toLowerCase().includes(lowerFilter))
    );
  }, [primaireSecondaireStudents, filter]);

  // Apply sorting
  const sortedStudents = useMemo(() => {
    const sorted = [...filteredStudents].sort((a, b) => {
      let aVal: string;
      let bVal: string;
      
      switch (sortField) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'email':
          aVal = a.email || '';
          bVal = b.email || '';
          break;
        case 'school_name':
          aVal = a.school_name || '';
          bVal = b.school_name || '';
          break;
        case 'class_name':
          aVal = a.class_name || '';
          bVal = b.class_name || '';
          break;
      }
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
    return sorted;
  }, [filteredStudents, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '⇅';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', color: '#111827' }}>Students - Primaire & Secondaire</h2>
        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
          Manage and view all students enrolled in primaire and secondaire schools.
        </p>
      </div>

      <div style={{ borderRadius: '8px', border: '1px solid #e5e7eb', backgroundColor: 'white', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="text"
              placeholder="Filter by name, email, school, or class..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                height: '40px',
                width: '350px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            />
          </div>
          <div style={{ fontSize: '14px', color: '#6b7280' }}>
            Total: {filteredStudents.length} student(s)
          </div>
        </div>

        {loading && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#6b7280' }}>Loading...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                    <th 
                      style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
                      onClick={() => handleSort('name')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Student Name
                        <span style={{ fontSize: '12px' }}>{getSortIcon('name')}</span>
                      </div>
                    </th>
                    <th 
                      style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
                      onClick={() => handleSort('email')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Email
                        <span style={{ fontSize: '12px' }}>{getSortIcon('email')}</span>
                      </div>
                    </th>
                    <th 
                      style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280', cursor: 'pointer' }}
                      onClick={() => handleSort('school_name')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        School
                        <span style={{ fontSize: '12px' }}>{getSortIcon('school_name')}</span>
                      </div>
                    </th>
                    <th style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280' }}>
                      School Type
                    </th>
                    <th style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280' }}>
                      Class
                    </th>
                    <th style={{ height: '48px', padding: '0 16px', textAlign: 'left', verticalAlign: 'middle', fontWeight: 500, color: '#6b7280' }}>
                      Parent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                        No students found for primaire or secondaire schools
                      </td>
                    </tr>
                  ) : (
                    paginatedStudents.map((s, index) => {
                      const schoolType = getSchoolType(s);
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb' }}>
                          <td style={{ padding: '16px' }}>
                            <div style={{ fontWeight: 500, color: '#111827' }}>{s.name}</div>
                          </td>
                          <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{s.email || '-'}</td>
                          <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>{s.school_name || '-'}</td>
                          <td style={{ padding: '16px' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '12px',
                              fontWeight: 500,
                              ...(schoolType === 'primaire'
                                ? { backgroundColor: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe' }
                                : schoolType === 'secondaire'
                                ? { backgroundColor: '#fce7f3', color: '#9d174d', border: '1px solid #fbcfe8' }
                                : { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }
                              )
                            }}>
                              {schoolType}
                            </span>
                          </td>
                          <td style={{ padding: '16px' }}>
                            {s.class_name ? (
                              <div>
                                <div style={{ fontWeight: 500, color: '#111827' }}>{s.class_name}</div>
                                {s.class_level && (
                                  <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.class_level}</div>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '14px' }}>Not assigned</span>
                            )}
                          </td>
                          <td style={{ padding: '16px' }}>
                            {s.parents && s.parents.length > 0 ? (
                              <div>
                                {s.parents.map((parent, idx) => (
                                  <div key={parent.id} style={{ marginBottom: idx < s.parents!.length - 1 ? '4px' : 0 }}>
                                    <div style={{ fontWeight: 500, color: '#111827', fontSize: '14px' }}>{parent.name}</div>
                                    {parent.email && (
                                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{parent.email}</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: '14px' }}>No parent linked</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderTop: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                  Page {currentPage} of {totalPages}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      opacity: currentPage === 1 ? 0.5 : 1,
                    }}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: 500,
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      backgroundColor: 'white',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      opacity: currentPage === totalPages ? 0.5 : 1,
                    }}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
