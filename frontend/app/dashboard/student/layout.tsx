"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaBook,
  FaUserGraduate,
  FaCalendarAlt,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import "./student.css";

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    courses: "Cours",
    profile: "Profil",
    schedule: "Emploi du temps",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher...",
    student: "Étudiant",
  },
  en: {
    dashboard: "Dashboard",
    courses: "Courses",
    profile: "Profile",
    schedule: "Schedule",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search...",
    student: "Student",
  },
};

function useTranslation(language: "fr" | "en") {
  return translations[language];
}

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const handleChange = () => setIsMobile(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isMobile;
}

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"fr" | "en">("en");

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  const menu = [
    { name: t.dashboard, href: "/dashboard/student", icon: <FaTachometerAlt /> },
    { name: t.courses, href: "/dashboard/student/courses", icon: <FaBook /> },
    { name: language === "fr" ? "Bulletin" : "Report Card", href: "/dashboard/student/bulletin", icon: <FaChartBar /> },
    { name: t.profile, href: "/dashboard/student/profile", icon: <FaUserGraduate /> },
    { name: t.schedule, href: "/dashboard/student/schedule", icon: <FaCalendarAlt /> },
    { name: t.reports, href: "/dashboard/student/reports", icon: <FaChartBar /> },
    { name: t.settings, href: "/dashboard/student/settings", icon: <FaCog /> },
  ];

  return (
    <div className={`student-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      <aside className="student-sidebar">
        <div className="student-logo">
          🎓 SP!K <span>Student</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input
              type="text"
              placeholder={t.search}
              className="student-search"
            />
          </div>
        )}

        <ul className="student-menu">
          {menu.map((item) => (
            <li
              key={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <Link href={item.href}>
                <span className="icon">{item.icon}</span>
                {sidebarOpen && item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="logout" onClick={() => {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('school_id');
          localStorage.removeItem('school_type');
          // Clear cookie to ensure clean logout
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.href = '/login';
        }} style={{ cursor: 'pointer' }}>
          <FaSignOutAlt /> {sidebarOpen && t.logout}
        </div>
      </aside>

      <div className="student-main">
      <header className="student-topbar">
  <div className="topbar-left">
    {!sidebarOpen && (
      <div
        className="student-logo"
        style={{ fontSize: "18px", marginBottom: "0", marginRight: "20px" }}
      >
        🎓 SP!K <span style={{ fontSize: "11px" }}>Student</span>
      </div>
    )}
    {!isMobile && (
      <input
        type="text"
        placeholder={t.search}
        className="student-search"
      />
    )}
  </div>

  <div className="topbar-right">
    <div className="language-selector">
      <button
        onClick={() => setLanguage(language === "fr" ? "en" : "fr")}
        className="language-btn"
      >
        {language === "fr" ? "EN" : "FR"}
      </button>
    </div>

    <div className="notification-icon">
      <FaBell />
      <span className="notification-badge">3</span>
    </div>

    <div className="student-profile">
      <img
        src="https://i.pravatar.cc/40"
        alt="profile"
        className="avatar"
      />
      <div className="profile-info">
        <strong>Student</strong>
        <p>{t.student}</p>
      </div>
    </div>
  </div>
</header>

        <main className="student-content">{children}</main>
      </div>
    </div>
  );
}