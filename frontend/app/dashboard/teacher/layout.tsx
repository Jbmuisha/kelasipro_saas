"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaTachometerAlt,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaBook,
  FaClipboardList,
  FaCalendarAlt,
  FaChartBar,
  FaBell,
  FaCog,
  FaSignOutAlt,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useState, useEffect } from "react";
import "@/app/dashboard/teacher/teacher.css";

/* ---------------- Translation System ---------------- */

const translations = {
  fr: {
    dashboard: "Tableau de bord",
    classes: "Classes",
    students: "Élèves",
    assignments: "Devoirs",
    grades: "Notes",
    attendance: "Présence",
    reports: "Rapports",
    settings: "Paramètres",
    logout: "Déconnexion",
    search: "Rechercher élèves, devoirs...",
    teacher: "Enseignant",
    welcome: "Bienvenue",
    myClasses: "Mes Classes",
    manageStudents: "Gérer les Élèves",
    createAssignment: "Créer un Devoir",
    viewGrades: "Voir les Notes",
    takeAttendance: "Prendre l'Appel",
    generateReports: "Générer des Rapports",
    profileSettings: "Paramètres du Profil",
    loading: "Chargement",
    noData: "Aucune donnée disponible",
    cancel: "Annuler",
  },
  en: {
    dashboard: "Dashboard",
    classes: "Classes",
    students: "Students",
    assignments: "Assignments",
    grades: "Grades",
    attendance: "Attendance",
    reports: "Reports",
    settings: "Settings",
    logout: "Logout",
    search: "Search students, assignments...",
    teacher: "Teacher",
    welcome: "Welcome",
    myClasses: "My Classes",
    manageStudents: "Manage Students",
    createAssignment: "Create Assignment",
    viewGrades: "View Grades",
    takeAttendance: "Take Attendance",
    generateReports: "Generate Reports",
    profileSettings: "Profile Settings",
    loading: "Loading",
    noData: "No data available",
    cancel: "Cancel",
  },
};

function useTranslation(language: "fr" | "en") {
  return translations[language];
}

/* ---------------- Responsive Hook ---------------- */

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

/* ---------------- Component ---------------- */

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [language, setLanguage] = useState<"fr" | "en">("fr");

  const t = useTranslation(language);
  const isMobile = useIsMobile();

  const menu = [
    { name: t.dashboard, href: "/dashboard/teacher", icon: <FaTachometerAlt /> },
    { name: t.classes, href: "/dashboard/teacher/classes", icon: <FaChalkboardTeacher /> },
    { name: t.students, href: "/dashboard/teacher/students", icon: <FaUserGraduate /> },
    { name: t.assignments, href: "/dashboard/teacher/assignments", icon: <FaClipboardList /> },
    { name: t.grades, href: "/dashboard/teacher/grades", icon: <FaBook /> },
    { name: t.attendance, href: "/dashboard/teacher/attendance", icon: <FaCalendarAlt /> },
    { name: t.reports, href: "/dashboard/teacher/reports", icon: <FaChartBar /> },
    { name: t.settings, href: "/dashboard/teacher/settings", icon: <FaCog /> },
  ];

  return (
    <div className={`teacher-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>

      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FaTimes /> : <FaBars />}
      </button>

      {/* Sidebar */}
      <aside className="teacher-sidebar">
        <div className="teacher-logo">
          📚 SP!K <span>Enseignant</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input
              type="text"
              placeholder={t.search}
              className="teacher-search"
            />
          </div>
        )}

        <ul className="teacher-menu">
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

        <div className="logout">
          <FaSignOutAlt /> {sidebarOpen && t.logout}
        </div>
      </aside>

      {/* Main */}
      <div className="teacher-main">
        <header className="teacher-topbar">

          <div className="topbar-left">
            {!sidebarOpen && (
              <div className="teacher-logo" style={{ fontSize: '18px', marginBottom: '0', marginRight: '20px' }}>
                📚 SP!K <span style={{ fontSize: '11px' }}>Enseignant</span>
              </div>
            )}
            {!isMobile && (
              <input
                type="text"
                placeholder={t.search}
                className="teacher-search"
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

            <div className="teacher-profile">
              <img
                src="https://i.pravatar.cc/40"
                alt="profile"
                className="avatar"
              />
              <div className="profile-info">
                <strong>Enseignant</strong>
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