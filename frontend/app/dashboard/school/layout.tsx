"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaSchool,
  FaChartBar,
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import "./school.css";

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    teachers: "Enseignants",
    students: "Élèves",
    classes: "Classes",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher...",
    schoolAdmin: "Administrateur de l'école",
    users: "Utilisateurs",
    secretary: "Secrétaire",
    courses: "Cours",
    schedule: "Horaire",
    payments: "Paiements",
    messages: "Messages",
  },
  en: {
    dashboard: "Dashboard",
    teachers: "Teachers",
    students: "Students",
    classes: "Classes",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search...",
    schoolAdmin: "School Administrator",
    users: "Users",
    secretary: "Secretary",
    courses: "Courses",
    schedule: "Schedule",
    payments: "Payments",
    messages: "Messages",
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

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"fr" | "en">("fr");
  const [schoolType, setSchoolType] = useState<string>("primaire");

  // Persist selection so pages can use the same school type and avoid mismatches.
  // If the logged-in SCHOOL_ADMIN has an admin_level, lock the UI to that level.
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const lockedLevel = user?.role === 'SCHOOL_ADMIN' ? user?.admin_level : null;

    if (lockedLevel) {
      setSchoolType(lockedLevel);
      localStorage.setItem('school_type', lockedLevel);
      return;
    }

    const saved = localStorage.getItem('school_type');
    if (saved) setSchoolType(saved);
  }, []);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const lockedLevel = user?.role === 'SCHOOL_ADMIN' ? user?.admin_level : null;

    // If locked, do not allow changing it via state updates.
    if (lockedLevel) {
      if (schoolType !== lockedLevel) setSchoolType(lockedLevel);
      localStorage.setItem('school_type', lockedLevel);
      return;
    }

    localStorage.setItem('school_type', schoolType);
  }, [schoolType]);

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  const baseMenu = [
    { name: t.dashboard, href: "/dashboard/school", icon: <FaTachometerAlt /> },
    { name: t.users || "All Users", href: "/dashboard/school/users", icon: <FaTachometerAlt /> },
    { name: t.settings, href: "/dashboard/school/settings", icon: <FaCog /> },
  ];

  const primaireSubmenu = [
    { name: t.classes, href: "/dashboard/school/classes", icon: <FaSchool /> },
    { name: t.teachers, href: "/dashboard/school/teachers", icon: <FaChalkboardTeacher /> },
    { name: t.secretary, href: "/dashboard/school/secretary", icon: <FaUserGraduate /> },
    { name: t.courses, href: "/dashboard/school/courses", icon: <FaChartBar /> },
    { name: "Notes", href: "/dashboard/school/grades", icon: <FaChartBar /> },
    { name: t.schedule, href: "/dashboard/school/schedule", icon: <FaCog /> },
    { name: t.payments, href: "/dashboard/school/payments", icon: <FaChartBar /> },
    { name: t.messages, href: "/dashboard/school/messages", icon: <FaBell /> },
  ];

  const secondaireSubmenu = [
    { name: t.classes, href: "/dashboard/school/classes", icon: <FaSchool /> },
    { name: t.teachers, href: "/dashboard/school/teachers", icon: <FaChalkboardTeacher /> },
    { name: t.secretary, href: "/dashboard/school/secretary", icon: <FaUserGraduate /> },
    { name: t.courses, href: "/dashboard/school/courses", icon: <FaChartBar /> },
    { name: t.schedule, href: "/dashboard/school/schedule", icon: <FaCog /> },
    { name: t.payments, href: "/dashboard/school/payments", icon: <FaChartBar /> },
    { name: t.messages, href: "/dashboard/school/messages", icon: <FaBell /> },
  ];

  const menu = [...baseMenu];
  const insertIndex = 1;
  const submenuToUse = ["primaire", "maternelle"].includes(schoolType) ? primaireSubmenu : secondaireSubmenu;
  menu.splice(insertIndex, 0, ...submenuToUse);

  return (
    <div className={`school-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      <aside className="school-sidebar">
        <div className="school-logo">📚 SP!K <span>School Admin</span></div>

        {/* School type selection removed: level is determined by login (SCHOOL_ADMIN.admin_level). */}

        {isMobile && (
          <div className="sidebar-controls">
            <input type="text" placeholder={t.search} className="school-search" />
          </div>
        )}

        <ul className="school-menu">
        {menu.map((item) => (
        <li key={item.href} className={pathname === item.href ? "active" : ""}>
        <Link href={item.href} className="menu-link">
        <span className="icon">{item.icon}</span>
        {sidebarOpen && <span className="label">{item.name}</span>}
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

      <div className="school-main">
        <header className="school-topbar">
          <div className="topbar-left">
            {!sidebarOpen && (
              <div className="school-logo small">📚 SP!K <span>School Admin</span></div>
            )}
            {!isMobile && <input type="text" placeholder={t.search} className="school-search" />}
          </div>

          <div className="topbar-right">
            <div className="language-selector">
              <button onClick={() => setLanguage(language === "fr" ? "en" : "fr") } className="language-btn">{language === "fr" ? "EN" : "FR"}</button>
            </div>
            <div className="notification-icon"><FaBell /><span className="notification-badge">3</span></div>
            <div className="school-profile">
              <img src="https://i.pravatar.cc/40" alt="profile" className="avatar" />
              <div className="profile-info"><strong>School Admin</strong><p>{t.schoolAdmin}</p></div>
            </div>
          </div>
        </header>

        <main className="school-content">{children}</main>
      </div>
    </div>
  );
}
