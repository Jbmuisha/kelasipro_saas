"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import{ FaTachometerAlt, FaBook, FaUserGraduate, FaCalendarAlt, FaChartBar, FaCog, FaSignOutAlt, FaBell, FaBars, FaTimes } from "react-icons/fa";
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
        const language = "fr";
        const t = useTranslation(language);
        const isMobile = useIsMobile();
      
        return (
          <div className="parent-layout">
            <aside className={`sidebar ${isMobile ? "mobile" : ""}`}>
              <div className="sidebar-header">
                <h2>{t.parent}</h2>
                {isMobile && (
                  <button className="menu-toggle">
                    <FaBars />
                  </button>
                )}
              </div>
              <nav className="sidebar-nav">
                <ul>
                  <li className={pathname === "/dashboard/parent" ? "active" : ""}>
                    <Link href="/dashboard/parent">
                      <FaTachometerAlt />
                      {t.dashboard}
                    </Link>
                  </li>
                  {/* Ajoutez d'autres liens de navigation ici */}
                </ul>
              </nav>
            </aside>
            <main className="content">{children}</main>
          </div>
        );
      }