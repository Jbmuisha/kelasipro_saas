"use client";

import Link from 'next/link';

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      <nav className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>School Admin</h2>
        </div>
        <ul className="sidebar-menu">
          <li>
            <Link href="/dashboard/school">Accueil</Link>
          </li>
          <li>
            <Link href="/dashboard/school/teachers">Gérer les enseignants</Link>
          </li>
          <li>
            <Link href="/dashboard/school/students">Gérer les élèves</Link>
          </li>
          <li>
            <Link href="/dashboard/school/classes">Classes</Link>
          </li>
          <li>
            <Link href="/dashboard/school/reports">Rapports</Link>
          </li>
        </ul>
      </nav>
      <main className="dashboard-main">
        {children}
      </main>
    </div>
  );
}
