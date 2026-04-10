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

  const logout = async () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_id");
    localStorage.removeItem("school_type");
    setUser(null);
  };

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
  // Clear any impersonation state if exists
  localStorage.removeItem("impersonation");
};


export const setImpersonation = async (teacherData: { id: number; role: string; schoolType?: string }) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) throw new Error('No admin token');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    const res = await fetch(`${API_URL}/api/admin/impersonate/${teacherData.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Impersonation failed');
    }

    const data = await res.json();
    // Store impersonated session
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('school_id', String(data.user.school_id || 0));
    localStorage.setItem('school_type', data.user.school_type || 'primaire');

    // Redirect with school_type prefix
    const schoolTypePath = data.user.school_type ? `/${data.user.school_type.toLowerCase()}` : '';
    window.location.href = `/dashboard${schoolTypePath}/teacher`;

  } catch (err: any) {
    alert(`Impersonation failed: ${err.message}`);
    console.error(err);
  }
};

