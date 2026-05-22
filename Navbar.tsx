import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  User, Search, MessageSquare, Briefcase, Plus, 
  CreditCard, Globe, Compass, LogOut, 
  Settings, LayoutDashboard, Bookmark, Menu, X,
  ChevronRight, ShieldCheck, Zap, Star, Shield
} from "lucide-react";
import { cn } from "../utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { createPortal } from "react-dom";
import { useAuth } from "../hooks/useAuth";
import NotificationCenter from "./NotificationCenter";

const UnreadBadge = () => {
  const { user, apiFetch, refreshUser } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await apiFetch("/api/messages/unread-count");
        if (res.ok) {
          const data = await res.json();
          setCount(data.count);
        }
      } catch (err) {}
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  if (count === 0) return null;
  return (
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-fuchsia-600 rounded-full border border-bg-dark z-10 animate-pulse" />
  );
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Body Scroll Lock & ESC listener
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleEsc);
    };
  }, [isSidebarOpen]);

  const handleLogout = () => {
    logout();
    setIsSidebarOpen(false);
    navigate("/");
  };

  return (
    <>
      <nav className="glass-nav z-[60]">
        <div className="max-w-7xl mx-auto px-4 w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link to="/" className="flex items-center space-x-2 group text-white">
              <div className="w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform shadow-md">
                <span className="font-bold text-sm text-white">JS</span>
              </div>
              <span className="text-base font-bold tracking-tight text-white">JobSwipe</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8 max-w-[60%] lg:max-w-none">
            <div className="flex space-x-6 text-xs font-semibold text-gray-400 overflow-x-auto no-scrollbar whitespace-nowrap py-1">
              {/* Workers ONLY see Work related items */}
              {(user?.role === 'worker') && (
                <>
                  <NavLink to="/marketplace?tab=jobs" active={location.pathname === "/marketplace" && (new URLSearchParams(location.search).get("tab") !== "workers")} icon={<Briefcase className="w-3.5 h-3.5" />}>Find Gigs</NavLink>
                  <NavLink to="/swipe" active={location.pathname === "/swipe"} icon={<Compass className="w-3.5 h-3.5" />}>Swipe Jobs</NavLink>
                </>
              )}

              {/* Employers ONLY see Talent related items */}
              {(user?.role === 'employer') && (
                <>
                  <NavLink to="/marketplace?tab=workers" active={location.pathname === "/marketplace" && (new URLSearchParams(location.search).get("tab") === "workers")} icon={<Globe className="w-3.5 h-3.5" />}>Talents</NavLink>
                  <NavLink to="/candidates" active={location.pathname === "/candidates"} icon={<Compass className="w-3.5 h-3.5" />}>Candidates</NavLink>
                </>
              )}

              {/* Guest Access (Marketplace only) */}
              {!user && (
                <>
                  <NavLink to="/marketplace?tab=jobs" active={location.pathname === "/marketplace" && (new URLSearchParams(location.search).get("tab") !== "workers")} icon={<Briefcase className="w-3.5 h-3.5" />}>Jobs</NavLink>
                  <NavLink to="/marketplace?tab=workers" active={location.pathname === "/marketplace" && (new URLSearchParams(location.search).get("tab") === "workers")} icon={<Globe className="w-3.5 h-3.5" />}>Talents</NavLink>
                </>
              )}
            </div>

            <div className="flex items-center space-x-4 border-l border-white/5 pl-6">
              {user ? (
                <div className="flex items-center space-x-4">
                  {user.role === 'employer' && (
                    <Link 
                      to="/create-job"
                      className="hidden lg:flex px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-medium items-center space-x-2 transition-all shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Post Job</span>
                    </Link>
                  )}
                  
                  <div className="flex items-center space-x-1 mr-2 border-r border-white/5 pr-4">
                    <NotificationCenter />
                    <Link to="/messages" className="relative p-2.5 rounded-lg hover:bg-white/5 transition-all group">
                      <MessageSquare className="w-5 h-5 group-hover:scale-105 transition-transform text-gray-300 group-hover:text-white" />
                      <UnreadBadge />
                    </Link>
                  </div>

                  <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-8 h-8 rounded-full border border-brand-primary/20 p-0.5 hover:border-brand-primary transition-all overflow-hidden flex items-center justify-center bg-white/5 relative group outline-none"
                  >
                    {user.profile_image_url ? (
                      <img src={user.profile_image_url} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-brand-primary group-hover:scale-105 transition-transform" />
                    )}
                    <span className={cn(
                      "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-bg-dark",
                      user.is_verified ? "bg-emerald-500" : "bg-amber-500"
                    )} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-4">
                  <Link to="/login" className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white transition-colors">Login</Link>
                  <Link to="/signup" className="px-5 py-2 bg-brand-primary hover:bg-brand-secondary rounded-lg text-xs font-medium text-white transition-all shadow-sm">Sign Up</Link>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Unified Slide-out Sidebar - Outside nav tag for z-index freedom */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-[9999]">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />
              
              {/* Sidebar Content */}
              <motion.div 
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 28, stiffness: 220 }}
                className="absolute right-0 top-0 bottom-0 w-[85%] sm:w-full sm:max-w-[340px] bg-bg-dark border-l border-white/10 shadow-[-30px_0_100px_rgba(0,0,0,0.8)] flex flex-col"
              >
               <div className="flex flex-col h-full relative overflow-hidden bg-bg-dark">
                {/* Visual Flair */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 blur-[80px] -z-10" />

                {/* Sidebar Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-center justify-center">
                      <Shield className="w-4 h-4 text-brand-primary" />
                    </div>
                    <div>
                      <span className="block text-xs font-semibold text-white">Menu</span>
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium text-gray-400">Authenticated</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSidebarOpen(false)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-white/5 rounded-lg transition-all text-gray-400 hover:text-white border border-white/5 group"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  {user ? (
                    <>
                      {/* User Profile Summary */}
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="w-16 h-16 rounded-xl border border-white/10 p-0.5 bg-bg-dark relative">
                            {user.profile_image_url ? (
                              <img src={user.profile_image_url} alt="Profile" className="w-full h-full rounded-lg object-cover" />
                            ) : (
                              <div className="w-full h-full rounded-lg bg-white/5 flex items-center justify-center">
                                <User className="w-6 h-6 text-brand-primary opacity-50" />
                              </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-emerald-500 w-5 h-5 rounded-md flex items-center justify-center border-2 border-bg-dark shadow">
                              <ShieldCheck className="w-3 h-3 text-white" />
                            </div>
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="font-semibold text-sm text-white">{user.name || "User"}</h4>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                              {user.role === 'admin' ? 'Administrator' : (user.role === 'employer' ? 'Employer' : 'Candidate')}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Navigation Groups */}
                      <div className="space-y-8">
                        <SidebarGroup label="Principal">
                          <SidebarLink to={user.role === 'employer' ? "/employer" : "/dashboard"} icon={<LayoutDashboard />} label="Dashboard" onClick={() => setIsSidebarOpen(false)} />
                          <SidebarLink to="/profile" icon={<User />} label="My Profile" onClick={() => setIsSidebarOpen(false)} />
                          <SidebarLink to="/messages" icon={<MessageSquare />} label="Messages" badge={<UnreadBadge />} onClick={() => setIsSidebarOpen(false)} />
                        </SidebarGroup>

                        <SidebarGroup label="Job Center">
                          {user.role === 'worker' && (
                            <>
                              <SidebarLink to="/swipe" icon={<Compass />} label="Swipe Jobs" onClick={() => setIsSidebarOpen(false)} />
                              <SidebarLink to="/applications" icon={<Briefcase />} label="My Applications" onClick={() => setIsSidebarOpen(false)} />
                              <SidebarLink to="/saved-jobs" icon={<Bookmark className="text-amber-500" />} label="Saved Jobs" onClick={() => setIsSidebarOpen(false)} />
                            </>
                          )}
                          <SidebarLink to="/earnings" icon={<CreditCard />} label="Earnings & History" onClick={() => setIsSidebarOpen(false)} />
                          {user.role === 'employer' && (
                            <>
                              <SidebarLink to="/create-job" icon={<Plus className="text-emerald-500" />} label="Post a Job" onClick={() => setIsSidebarOpen(false)} />
                              <SidebarLink to="/candidates" icon={<Compass className="text-brand-primary" />} label="Swipe Candidates" onClick={() => setIsSidebarOpen(false)} />
                              <SidebarLink to="/saved-candidates" icon={<Bookmark className="text-amber-500" />} label="Saved Candidates" onClick={() => setIsSidebarOpen(false)} />
                            </>
                          )}
                        </SidebarGroup>

                        <SidebarGroup label="Account & Billing">
                          <SidebarLink to="/profile" icon={<ShieldCheck className="text-emerald-400" />} label="Identity Verification" onClick={() => setIsSidebarOpen(false)} />
                          <SidebarLink to="/pricing" icon={<Zap className="text-amber-400" />} label="Billing & Pro" onClick={() => setIsSidebarOpen(false)} />
                          <SidebarLink to="/settings" icon={<Settings />} label="Settings" onClick={() => setIsSidebarOpen(false)} />
                          {user.role === 'admin' && (
                            <SidebarLink to="/admin" icon={<Shield className="text-brand-primary" />} label="Admin Dashboard" onClick={() => setIsSidebarOpen(false)} />
                          )}
                        </SidebarGroup>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-10 pt-10">
                      <div className="text-center space-y-6">
                          <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto border border-dashed border-white/10 relative">
                            <Zap className="w-10 h-10 text-brand-primary opacity-40" />
                          </div>
                          <div className="space-y-3">
                            <h3 className="text-xl font-bold text-white">Welcome Guest</h3>
                            <p className="text-xs text-gray-400 leading-relaxed px-6">Sign in or register to interact with jobs and candidates.</p>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <Link to="/signup" onClick={() => setIsSidebarOpen(false)} className="block w-full py-3.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-xs font-semibold text-center shadow-md transition-all flex items-center justify-center">Create Account</Link>
                          <Link to="/login" onClick={() => setIsSidebarOpen(false)} className="block w-full py-3.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-center hover:bg-white/10 transition-all flex items-center justify-center text-gray-300">Log In</Link>
                      </div>
                      
                      <div className="h-px w-full bg-white/5 my-10" />
                      
                      <SidebarGroup label="Directories">
                        <SidebarLink to="/marketplace?tab=jobs" icon={<Briefcase />} label="Explore Jobs" onClick={() => setIsSidebarOpen(false)} />
                        <SidebarLink to="/marketplace?tab=workers" icon={<Globe />} label="Explore Candidates" onClick={() => setIsSidebarOpen(false)} />
                        <SidebarLink to="/swipe" icon={<Compass />} label="Swipe Gigs" onClick={() => setIsSidebarOpen(false)} />
                      </SidebarGroup>
                    </div>
                  )}
                </div>

                {/* Sidebar Footer */}
                {user && (
                  <div className="p-8 border-t border-white/5 bg-black/40">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center space-x-3 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500/20 transition-all group active:scale-95 text-xs font-medium"
                    >
                      <LogOut className="w-4 h-4 group-hover:translate-x-[-4px] transition-transform" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
    )}
    </>
  );
};

const NavLink = ({ to, children, active, icon }: { to: string, children: React.ReactNode, active: boolean, icon?: React.ReactNode }) => (
  <Link 
    to={to} 
    className={cn(
      "flex items-center space-x-2 transition-all relative py-1",
      active ? "text-white" : "hover:text-white"
    )}
  >
    {icon}
    <span>{children}</span>
    {active && (
      <motion.div 
        layoutId="nav-underline"
        className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-primary"
      />
    )}
  </Link>
);

const SidebarGroup = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-2">
    <h5 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest pl-1">{label}</h5>
    <div className="space-y-1">
      {children}
    </div>
  </div>
);

const SidebarLink = ({ to, icon, label, onClick, badge }: { to: string, icon: React.ReactNode, label: string, onClick: () => void, badge?: React.ReactNode }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-white/5 transition-all group"
  >
    <div className="flex items-center space-x-3">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-all [&_svg]:w-4 [&_svg]:h-4">
        {icon}
      </div>
      <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">{label}</span>
    </div>
    <div className="flex items-center space-x-2">
      {badge}
      <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:translate-x-0.5 transition-all" />
    </div>
  </Link>
);

export default Navbar;
