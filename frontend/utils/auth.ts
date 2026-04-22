import { useEffect, useState, useCallback } from "react";

export interface User {
  id: number;
  name: string;
  email?: string;
  role: string;
  school_id?: number;
  school_type?: string;
  unique_id?: string;
  profile_image?: string;
  admin_level?: string;
  class_id?: number;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let token = localStorage.getItem("token");
    let storedUser = localStorage.getItem("user");

    // Fallback to cookie if localStorage missing
    if (!token || !storedUser) {
      token = getCookie("token");
      storedUser = localStorage.getItem("user"); // Try LS user still
      if (token && !storedUser) {
        // Sync cookie token to LS for consistency
        localStorage.setItem("token", token);
      }
    }

    if (token && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);


  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_id");
    localStorage.removeItem("school_type");
    localStorage.removeItem("impersonation");
    localStorage.removeItem("admin_token_backup");
    localStorage.removeItem("admin_user_backup");
    setUser(null);
  }, []);

  const updateUser = (updates: Partial<User>) => {
    const current = user;
    if (current) {
      const updated = { ...current, ...updates };
      localStorage.setItem("user", JSON.stringify(updated));
      setUser(updated);
    }
  };

  return { user, loading, login, logout, updateUser };
};

export const useEffectiveUser = () => {
  const { user } = useAuth();
  return [user, false] as const;
};

export const logout = async () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("school_id");
  localStorage.removeItem("school_type");
  localStorage.removeItem("impersonation");
  localStorage.removeItem("admin_token_backup");
  localStorage.removeItem("admin_user_backup");
  
  // Clear cookie to ensure clean logout
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  
  window.location.href = "/login";
};

export const clearImpersonation = () => {
  const impersonation = localStorage.getItem('impersonation');
  const backupToken = localStorage.getItem('admin_token_backup');
  const backupUser = localStorage.getItem('admin_user_backup');

  if (impersonation && backupToken && backupUser) {
    try {
      const adminUser = JSON.parse(backupUser);
      localStorage.setItem('token', backupToken);
      localStorage.setItem('user', backupUser);
      localStorage.setItem('school_id', String(adminUser?.school_id || 0));
      localStorage.setItem('school_type', adminUser?.school_type || 'primaire');
      
      // Redirect to admin dashboard after restoring session
      window.location.href = adminUser.role === 'SUPER_ADMIN' ? '/dashboard/admin' : '/dashboard/school';
      return; // Exit early
    } catch {
      // ignore parse errors and just clear backups below
    }
  }

  // Fallback: full logout if no valid backup
  localStorage.removeItem('impersonation');
  localStorage.removeItem('admin_token_backup');
  localStorage.removeItem('admin_user_backup');
  window.location.href = '/login';
};


export const setImpersonation = async (teacherData: { id: number; role: string | undefined; schoolType?: string }) => {
  try {
    // Check user role before attempting impersonation
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const userRole = currentUser?.role;
    
    // Only SCHOOL_ADMIN or SUPER_ADMIN can impersonate
    if (userRole !== 'SCHOOL_ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new Error('Only ADMIN users can impersonate teachers');
    }

    // Always use admin token backup for impersonation - the current token might be a teacher
    let token = localStorage.getItem('admin_token_backup');
    if (!token) {
      // Fallback to current token if no backup exists (first time impersonating)
      token = localStorage.getItem('token');
    }
    if (!token) throw new Error('No admin token');

    console.log('[IMPERSONATE DEBUG] Current user:', currentUser);
    console.log('[IMPERSONATE DEBUG] Current user role:', userRole);
    console.log('[IMPERSONATE DEBUG] Token exists:', !!token);

    // Save admin session before replacing it with impersonated session.
    if (!localStorage.getItem('admin_token_backup')) {
      localStorage.setItem('admin_token_backup', token);
    }
    if (currentUser && !localStorage.getItem('admin_user_backup')) {
      localStorage.setItem('admin_user_backup', currentUser);
    }

    // Use different endpoint based on user role
    const endpoint = (userRole === 'SUPER_ADMIN') 
      ? `/api/auth/admin/impersonate/${teacherData.id}` 
      : `/api/auth/school/impersonate/${teacherData.id}`;
    
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impersonation failed');
    }

    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('impersonation', JSON.stringify({ teacher_id: teacherData.id }));
    localStorage.setItem('school_id', String(data.user.school_id || 0));
    localStorage.setItem('school_type', data.user.school_type || 'primaire');

    // Navigate to role-appropriate dashboard
    const rolePaths: Record<string, string> = {
      'TEACHER': '/dashboard/teacher',
      'STUDENT': '/dashboard/student',
      'PARENT': '/dashboard/parent', 
      'SECRETARY': '/dashboard/secretary',
      'SCHOOL_ADMIN': '/dashboard/school',
      'SUPER_ADMIN': '/dashboard/admin'
    };
    const rolePath = rolePaths[data.user.role] || '/dashboard';
    window.location.href = rolePath;
  } catch (err: any) {
    alert(`Impersonation failed: ${err.message}`);
    console.error(err);
  }
};

