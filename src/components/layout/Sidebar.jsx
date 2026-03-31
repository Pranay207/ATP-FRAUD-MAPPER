import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ShieldAlert, Bell,
  ClipboardList, Smartphone,
  Building2, LayoutDashboard, ChevronLeft, ChevronRight,
  FileText
} from "lucide-react";
import { useAppState } from "@/hooks/useAppState";
import apPoliceLogo from "@/assets/ap-police-logo.svg";

const NAV_ITEMS = [
  { path: "/", icon: LayoutDashboard, label: "Dashboard" },
  { path: "/classification", icon: ShieldAlert, label: "Account Roles" },
  { path: "/alerts", icon: Bell, label: "Alerts", showBadge: true },
  { path: "/actions", icon: ClipboardList, label: "Action Steps" },
  { path: "/devices", icon: Smartphone, label: "Devices & IPs" },
  { path: "/banks", icon: Building2, label: "Banks" },
  { path: "/audit-logs", icon: FileText, label: "Audit Trail" },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { alerts } = useAppState();
  const unread = alerts.filter((a) => !a.is_read).length;

  return (
    <aside className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border z-40 transition-all duration-300 flex flex-col shadow-lg ${collapsed ? "w-16" : "w-64"}`}>
      {/* Logo */}
      <div className="h-20 flex items-center px-4 border-b border-sidebar-border gap-3">
        <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-white/40 p-1 flex items-center justify-center flex-shrink-0 overflow-hidden">
          <img
            src={apPoliceLogo}
            alt="AP Police"
            className="w-full h-full object-contain"
          />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-sm font-bold text-white tracking-wide">AP FraudTrail</h1>
            <p className="text-[11px] text-white/70">Anantapur Cyber Cell</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          const badge = item.showBadge && unread > 0 ? unread : null;
          return (
            <Link key={item.path} to={item.path}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition-all relative ${
                isActive ? "bg-white/20 text-white font-semibold shadow" : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-white" : "text-white/70"}`} />
              {!collapsed && (
                <>
                  <span className="truncate text-[13px]">{item.label}</span>
                  {badge && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </>
              )}
              {collapsed && badge && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <button onClick={onToggle} className="h-12 flex items-center justify-center border-t border-sidebar-border text-white/60 hover:text-white transition-colors">
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
