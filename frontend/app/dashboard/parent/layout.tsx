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
import { FaMessage } from "react-icons/fa6";
import { useState, useEffect } from "react";
import "./parent.css";

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
    parent: "Parent",
    message: "Message",
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
    parent: "Parent",
    message: "Message",
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

export default function ParentLayout({
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
    { name: t.dashboard, href: "/dashboard/parent", icon: <FaTachometerAlt /> },
    { name: language === "fr" ? "Bulletins" : "Report Cards", href: "/dashboard/parent/bulletins", icon: <FaChartBar /> },
    { name: t.profile, href: "/dashboard/parent/profile", icon: <FaUserGraduate /> },
    { name: t.settings, href: "/dashboard/parent/settings", icon: <FaCog /> },
  ];

  return (
    <div className={`parent-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className="parent-sidebar">
        <div className="parent-logo">
          🎓 SP!K <span>Parent</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input
              type="text"
              placeholder={t.search}
              className="parent-search"
            />
          </div>
        )}

        <ul className="parent-menu">
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
          window.location.href = '/login';
        }} style={{ cursor: 'pointer' }}>
          <FaSignOutAlt /> {sidebarOpen && t.logout}
        </div>
      </aside>

      {/* Main */}
      <div className="parent-main">
        <header className="parent-topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <div
                className="parent-logo"
                style={{ fontSize: "18px", marginBottom: "0", marginRight: "20px" }}
              >
                🎓 SP!K <span style={{ fontSize: "11px" }}>Parent</span>
              </div>
            )}
            {!isMobile && (
              <input
                type="text"
                placeholder={t.search}
                className="parent-search"
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

            <div className="parent-profile">
              <img
                src="https://i.pravatar.cc/40"
                alt="profile"
                className="avatar"
              />
              <div className="profile-info">
                <strong>Parent</strong>
                <p>{t.parent}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="parent-content">{children}</main>
      </div>
    </div>
  );
}