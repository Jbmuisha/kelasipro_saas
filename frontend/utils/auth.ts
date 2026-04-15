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

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
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
    } catch {
      // ignore parse errors and just clear backups below
    }
  }

  localStorage.removeItem('impersonation');
  localStorage.removeItem('admin_token_backup');
  localStorage.removeItem('admin_user_backup');
};

export const setImpersonation = async (teacherData: { id: number; role: string | undefined; schoolType?: string }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No admin token');

    // Save admin session before replacing it with impersonated session.
    if (!localStorage.getItem('admin_token_backup')) {
      localStorage.setItem('admin_token_backup', token);
    }
    const currentUser = localStorage.getItem('user');
    if (currentUser && !localStorage.getItem('admin_user_backup')) {
      localStorage.setItem('admin_user_backup', currentUser);
    }

    const res = await fetch(`/api/auth/admin/impersonate/${teacherData.id}`, {
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

    const schoolTypePath = data.user.school_type ? `/${data.user.school_type.toLowerCase()}` : '';
    window.location.href = `/dashboard${schoolTypePath}/teacher`;
  } catch (err: any) {
    alert(`Impersonation failed: ${err.message}`);
    console.error(err);
  }
};
