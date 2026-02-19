"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FaHome,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaSchool,
  FaChartBar,
} from "react-icons/fa";
import "./school.css";

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const menu = [
    {
      name: "Accueil",
      href: "/dashboard/school",
      icon: <FaHome />,
    },
    {
      name: "Enseignants",
      href: "/dashboard/school/teachers",
      icon: <FaChalkboardTeacher />,
    },
    {
      name: "Élèves",
      href: "/dashboard/school/students",
      icon: <FaUserGraduate />,
    },
    {
      name: "Classes",
      href: "/dashboard/school/classes",
      icon: <FaSchool />,
    },
    {
      name: "Rapports",
      href: "/dashboard/school/reports",
      icon: <FaChartBar />,
    },
  ];

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">📚 SP!K</div>

        <ul className="menu">
          {menu.map((item) => (
            <li
              key={item.href}
              className={pathname === item.href ? "active" : ""}
            >
              <Link href={item.href}>
                <span className="icon">{item.icon}</span>
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <input
            type="text"
            placeholder="What do you want to find?"
            className="search"
          />

          <div className="profile">
            <img
              src="https://i.pravatar.cc/40"
              alt="profile"
              className="avatar"
            />
            <span>Admin</span>
          </div>
        </header>

        {/* Content */}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
