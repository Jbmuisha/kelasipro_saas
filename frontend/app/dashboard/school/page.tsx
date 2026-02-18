"use client";

import { useEffect, useState } from "react";
import "@/styles/dashboard.css";
import { useRouter } from "next/navigation";

export default function SchoolDashboard() {
  return (
    <div className="dashboard-container">
      <h1>School Admin Dashboard</h1>
      <div className="dashboard-content">
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <h3>Manage Teachers</h3>
            <p>View and manage teachers in your school</p>
          </div>
          <div className="dashboard-card">
            <h3>Manage Students</h3>
            <p>View and manage students in your school</p>
          </div>
          <div className="dashboard-card">
            <h3>Classes</h3>
            <p>Manage classes and assignments</p>
          </div>
          <div className="dashboard-card">
            <h3>Reports</h3>
            <p>Generate school reports</p>
          </div>
        </div>
      </div>
    </div>
  );
}
