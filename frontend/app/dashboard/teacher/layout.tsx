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
import { useState, useEffect } from "react";
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

function useTranslation(language: "fr" | "en") {
  return translations[language];
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [teacherName, setTeacherName] = useState("Enseignant");
  const [unreadMessages, setUnreadMessages] = useState(0);

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.name) setTeacherName(u.name);
      }
    } catch {}
  }, []);

  // Fetch unread message count
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/messages/unread-count", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadMessages(data.unread || 0);
        }
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("school_id");
    localStorage.removeItem("school_type");
    window.location.href = "/login";
  };

  const menu = [
    { name: t.dashboard, href: "/dashboard/teacher", icon: <FaTachometerAlt /> },
    { name: t.classes, href: "/dashboard/teacher/classes", icon: <FaChalkboardTeacher /> },
    { name: t.students, href: "/dashboard/teacher/students", icon: <FaUserGraduate /> },
    { name: t.grades, href: "/dashboard/teacher/grades", icon: <FaPencilAlt /> },
    { name: t.attendance, href: "/dashboard/teacher/attendance", icon: <FaCalendarAlt /> },
    {
      name: t.messages,
      href: "/dashboard/teacher/messages",
      icon: <FaEnvelope />,
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { name: "Mon Profil", href: "/dashboard/teacher/profile", icon: <FaCog /> },
  ];

  return (
    <div className={`teacher-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>
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
            <li key={item.href} className={pathname === item.href ? "active" : ""}>
              <Link href={item.href} className="menu-link">
                <span className="icon">{item.icon}</span>
                {sidebarOpen && (
                  <span className="label">
                    {item.name}
                    {(item as any).badge && (
                      <span
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          borderRadius: 10,
                          padding: "1px 7px",
                          fontSize: 11,
                          fontWeight: 700,
                          marginLeft: 8,
                        }}
                      >
                        {(item as any).badge}
                      </span>
                    )}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>

        <div className="logout" onClick={handleLogout} style={{ cursor: "pointer" }}>
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
              <button onClick={() => setLanguage(language === "fr" ? "en" : "fr")} className="language-btn">
                {language === "fr" ? "EN" : "FR"}
              </button>
            </div>

            <Link href="/dashboard/teacher/messages" className="notification-icon" style={{ position: "relative", textDecoration: "none", color: "inherit" }}>
              <FaBell />
              {unreadMessages > 0 && <span className="notification-badge">{unreadMessages}</span>}
            </Link>

            <div className="teacher-profile">
              <img src="https://i.pravatar.cc/40" alt="profile" className="avatar" />
              <div className="profile-info">
                <strong>{teacherName}</strong>
                <p>{t.teacher}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="teacher-content">{children}</main>
      </div>
    </div>
  );
}
