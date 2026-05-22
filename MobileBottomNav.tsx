import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Zap, Clock, User, Briefcase, Calculator, Globe, MessageSquare } from "lucide-react";

export default function MobileBottomNav({ isEmployer }: { isEmployer: boolean }) {
  const location = useLocation();

  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 h-16 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-around px-4 z-50 shadow-2xl">
      <NavItem 
        to={isEmployer ? "/employer" : "/dashboard"} 
        active={location.pathname === (isEmployer ? "/employer" : "/dashboard")}
        icon={<Zap className="w-5 h-5" />} 
      />
      <NavItem 
        to={isEmployer ? "/marketplace?tab=workers" : "/marketplace?tab=jobs"} 
        active={location.pathname === "/marketplace"}
        icon={isEmployer ? <Globe className="w-5 h-5" /> : <Briefcase className="w-5 h-5" />} 
      />
      <NavItem 
        to={isEmployer ? "/candidates" : "/swipe"} 
        active={location.pathname === (isEmployer ? "/candidates" : "/swipe")}
        icon={<Search className="w-5 h-5" />} 
      />
      <NavItem 
        to="/messages" 
        active={location.pathname === "/messages"}
        icon={<MessageSquare className="w-5 h-5" />} 
      />
      <NavItem 
        to="/profile" 
        active={location.pathname === "/profile"}
        icon={<User className="w-5 h-5" />} 
      />
    </div>
  );
}

function NavItem({ to, active, icon }: { to: string, active: boolean, icon: React.ReactNode }) {
  return (
    <Link 
      to={to} 
      className={`p-3 rounded-xl transition-all ${active ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-110" : "text-gray-400"}`}
    >
      {icon}
    </Link>
  );
}
