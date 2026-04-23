"use client";

import { useEffect, useState } from "react";
import { FaTachometerAlt, FaBook, FaUserGraduate, FaCalendarAlt, FaChartBar, FaCog, FaSignOutAlt, FaBell, FaBars, FaTimes } from "react-icons/fa";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./students.css";

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
    students: "Étudiants",
    parents: "Parents",
    class: "Classe",
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
    students: "Students",
    parents: "Parents",
    class: "Class",
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

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pathname = usePathname();
  const [language, setLanguage] = useState<"fr" | "en">("en");
  const isMobile = useIsMobile();

  const t = useTranslation(language);

  const menu = [
    { name: t.dashboard, href: "/dashboard/student", icon: <FaTachometerAlt /> },
    { name: t.courses, href: "/dashboard/student/courses", icon: <FaBook /> },
    { name: language === "fr" ? "Bulletin" : "Report Card", href: "/dashboard/student/bulletin", icon: <FaChartBar /> },
    { name: t.profile, href: "/dashboard/student/profile", icon: <FaUserGraduate /> },
    { name: t.schedule, href: "/dashboard/student/schedule", icon: <FaCalendarAlt /> },
    { name: t.reports, href: "/dashboard/student/reports", icon: <FaChartBar /> },
    { name: t.settings, href: "/dashboard/student/settings", icon: <FaCog /> },
  ];

  useEffect(() => {
    const fetchStudents = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const schoolId = localStorage.getItem("school_id");

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/api/students?school_id=${schoolId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error("Failed to load students");

        const data = await res.json();
        setStudents(data.students || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error loading students");
      } finally {
        setLoading(false);
      }
    };

    if (pathname.includes("students")) {
      fetchStudents();
    }
  }, [pathname]);

  return (
    <div className={`student-layout ${isMobile ? "sidebar-closed" : ""}`}>
      <button className="sidebar-toggle" onClick={() => setLanguage(language === "fr" ? "en" : "fr")}>
        {isMobile && (language === "fr" ? <FaTimes /> : <FaBars />)}
      </button>

      <aside className="student-sidebar">
        <div className="student-logo">
          🎓 SP!K <span>Student</span>
        </div>

        {isMobile && (
          <div className="sidebar-controls">
            <input type="text" placeholder={t.search} className="student-search" />
          </div>
        )}

        <ul className="student-menu">
          {menu.map((item) => (
            <li key={item.href} className={pathname === item.href ? "active" : ""}>
              <Link href={item.href}>
                <span className="icon">{item.icon}</span>
                {isMobile && item.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="logout" onClick={() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          localStorage.removeItem("school_id");
          localStorage.removeItem("school_type");
          document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
          window.location.href = "/login";
        }} style={{ cursor: "pointer" }}>
          <FaSignOutAlt /> {isMobile && t.logout}
        </div>
      </aside>

      <div className="student-main">
        <header className="student-topbar">
          <div className="topbar-left">
            {!isMobile && (
              <div className="student-logo" style={{ fontSize: "18px", marginBottom: "0", marginRight: "20px" }}>
                🎓 SP!K <span style={{ fontSize: "11px" }}>Student</span>
              </div>
            )}
            {!isMobile && (
              <input type="text" placeholder={t.search} className="student-search" />
            )}
          </div>

          <div className="topbar-right">
            <div className="language-selector">
              <button onClick={() => setLanguage(language === "fr" ? "en" : "fr")} className="language-btn">
                {language === "fr" ? "EN" : "FR"}
              </button>
            </div>
            <div className="notification-icon">
              <FaBell />
              <span className="notification-badge">3</span>
            </div>
            <div className="student-profile">
              <img src="https://i.pravatar.cc/40" alt="profile" className="avatar" />
              <div className="profile-info">
                <strong>Student</strong>
                <p>{t.student}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="student-content">
          <div className="page-header">
            <h1>{t.students}</h1>
          </div>

          {error && <p className="no-data">{error}</p>}
          {loading && <p className="loading">Loading students...</p>}

          {!loading && !error && students.length > 0 && (
            <div className="students-table-container">
              <table className="students-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>Parent</th>
                    <th>Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{student.name}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>{student.email}</div>
                      </td>
                      <td data-class-id={student.class_id}>
                        {student.class_id ? "Loading..." : "Unknown"}
                      </td>
                      <td data-parent-id={student.id}>
                        {student.parent_name ? student.parent_name : "Loading..."}
                      </td>
                      <td data-parent-contact="true">
                        {student.parent_contact ? student.parent_contact : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && students.length === 0 && (
            <p className="no-data">No students found.</p>
          )}
        </main>
      </div>
    </div>
  );
}