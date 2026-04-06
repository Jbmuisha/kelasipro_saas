"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBook,
  FaClipboardList,
  FaCalendarAlt,
  FaChartBar,
  FaPencilAlt,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaEnvelope,
} from "react-icons/fa";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from 'socket.io-client';
import { useEffectiveUser, clearImpersonation, logout } from "@/utils/auth";
import "@/app/dashboard/teacher/teacher.css";

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    classes: "Mes Classes",
    students: "Élèves",
    courses: "Mes Cours",
    assignments: "Devoirs",
    grades: "Notes",
    attendance: "Présence",
    reports: "Rapports",
    messages: "Messages",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher...",
    teacher: "Enseignant",
  },
  en: {
    dashboard: "Dashboard",
    classes: "My Classes",
    students: "Students",
    courses: "My Courses",
    assignments: "Assignments",
    grades: "Grades",
    attendance: "Attendance",
    reports: "Reports",
    messages: "Messages",
    settings: "Settings",
    logout: "Logout",
    search: "Search...",
    teacher: "Teacher",
  },
};

function useTranslation(language: 'fr' | 'en') {
  return translations[language];
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [effectiveUser, effectiveLoading] = useEffectiveUser();
  const [teacherName, setTeacherName] = useState('Enseignant');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  // Role guard
  useEffect(() => {
    if (effectiveLoading || !effectiveUser) return;
    if (effectiveUser.role !== 'TEACHER') {
      router.replace('/dashboard/school');
    }
  }, [effectiveUser, effectiveLoading, router]);

  useEffect(() => {
    if (effectiveLoading || !effectiveUser) return;
    setTeacherName(effectiveUser.name);
  }, [effectiveUser, effectiveLoading]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token || !effectiveUser) return;

    const fetchUnread = async () => {
      try {
        const res = await fetch('/api/messages/unread-count', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unread || 0);
        }
      } catch {}
    };
    fetchUnread();

    socketRef.current = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current?.emit('join_school');
    });

    socketRef.current.on('unread_update', (data) => {
      if (data.user_id === effectiveUser.id) {
        setUnreadMessages((prev) => Math.max(0, prev + data.delta));
      }
    });

    socketRef.current.on('connect_error', (err) => {
      console.warn('Socket error:', err);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [effectiveUser]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.warn('[LOGOUT] Error:', err);
    }
    window.location.href = '/login';
  };

  const menu = [
    { name: t.dashboard, href: '/dashboard/teacher', icon: <FaTachometerAlt /> },
    { name: t.classes, href: '/dashboard/teacher/classes', icon: <FaChalkboardTeacher /> },
    { name: t.students, href: '/dashboard/teacher/students', icon: <FaUserGraduate /> },
    { name: t.grades, href: '/dashboard/teacher/grades', icon: <FaPencilAlt /> },
    { name: t.attendance, href: '/dashboard/teacher/attendance', icon: <FaCalendarAlt /> },
    {
      name: t.messages,
      href: '/dashboard/teacher/messages',
      icon: <FaEnvelope />,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { name: 'Mon Profil', href: '/dashboard/teacher/profile', icon: <FaCog /> },
  ];

  return (
    <div className={`teacher-layout ${sidebarOpen ? '' : 'sidebar-closed'}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      <aside className="teacher-sidebar">
        <div className="teacher-logo">
          📚 SP!K <span>Enseignant</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input type="text" placeholder={t.search} className="teacher-search" />
          </div>
        )}

        <ul className="teacher-menu">
          {menu.map((item) => (
            <li key={item.href} className={pathname === item.href ? 'active' : ''}>
              <Link href={item.href} className="menu-link">
                <span className="icon">{item.icon}</span>
                {sidebarOpen && (
                  <span className="label">
                    {item.name}
                    {item.badge && (
                      <span
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          borderRadius: 10,
                          padding: '1px 7px',
                          fontSize: 11,
                          fontWeight: 700,
                          marginLeft: 8,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>
          <FaSignOutAlt /> {sidebarOpen && t.logout}
        </div>
      </aside>

      <div className="teacher-main">
        <header className="teacher-topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <div className="teacher-logo small">
                📚 SP!K <span>Enseignant</span>
              </div>
            )}
            {!isMobile && <input type="text" placeholder={t.search} className="teacher-search" />}
          </div>

          <div className="topbar-right">
            <div className="language-selector">
              <button onClick={() => setLanguage(language === 'fr' ? 'en' : 'fr')} className="language-btn">
                {language === 'fr' ? 'EN' : 'FR'}
              </button>
            </div>

            <Link href="/dashboard/teacher/messages" className="notification-icon" style={{ position: 'relative', textDecoration: 'none', color: 'inherit' }}>
              <FaBell />
              {unreadMessages > 0 && <span className="notification-badge">{unreadMessages}</span>}
            </Link>

            <div className="teacher-profile">
              <img src="https://i.pravatar.cc/40" alt="profile" className="avatar" />
              <div className="profile-info">
                <strong>{teacherName}</strong>
                <p>{effectiveUser?.role === 'TEACHER' ? t.teacher : 'Assistant'}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="teacher-content">{children}</main>
      </div>
    </div>
  );
}
