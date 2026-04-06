import { useEffect, useState } from 'react';

export interface User {
  id: number;
  name: string;
  email?: string;
  role: string;
  school_id?: number;
  // Add other fields as needed
  [key: string]: any;
}

/**
 * Returns the effective user: impersonated_user (for "Login As") or stored user.
 * Use this in all teacher dashboard components instead of direct localStorage.user.
 */
export function getEffectiveUser(): User | null {
  try {
    const impersonatedStr = localStorage.getItem('impersonated_user');
    if (impersonatedStr) {
      return JSON.parse(impersonatedStr) as User;
    }
    
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr) as User;
    }
  } catch (e) {
    console.error('Error parsing user data:', e);
    // Clear corrupted data
    localStorage.removeItem('impersonated_user');
    localStorage.removeItem('user');
  }
  return null;
}

/**
 * Hook version for React components.
 */
export function useEffectiveUser(): [User | null, boolean] {
  const [effectiveUser, setEffectiveUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getEffectiveUser();
    setEffectiveUser(user);
    setLoading(false);

    // Listen for storage changes (e.g., login as)
    const handleStorageChange = () => {
      const newUser = getEffectiveUser();
      setEffectiveUser(newUser);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return [effectiveUser, loading];
}

/**
 * Clear impersonation (back to admin/normal user).
 */
export function clearImpersonation() {
  localStorage.removeItem('impersonated_user');
}

/**
 * Set impersonation (from admin "Login As" button).
 */
export function setImpersonation(teacherUser: User) {
  localStorage.setItem('impersonated_user', JSON.stringify(teacherUser));
}

/**
 * Logout clears both user and impersonation.
 * Async: calls backend /logout first.
 */
export async function logout(): Promise<void> {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      console.warn('[LOGOUT] Backend logout failed, clearing client-side:', err);
    }
  }
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('impersonated_user');
  localStorage.removeItem('school_id');
  localStorage.removeItem('school_type');
}

