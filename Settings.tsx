import React, { useState } from "react";
import { 
  User, Lock, Bell, LogOut, Shield, 
  CreditCard, Globe, Zap, ChevronRight, 
  Trash2, Mail, Smartphone, Eye, EyeOff, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const Settings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState("account");

  const [notificationSettings, setNotificationSettings] = useState({
    emailJobs: true,
    emailMessages: true,
    pushMessages: false,
    smsAlerts: false
  });

  const handleLogout = () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const handleToggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success("Preference updated");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          <h2 className="text-xl font-extrabold tracking-tight text-white mb-6">
            Settings
          </h2>
          
          <NavButton 
            icon={<User className="w-4 h-4" />} 
            label="Account Info" 
            active={activeSection === "account"} 
            onClick={() => setActiveSection("account")}
          />
          <NavButton 
            icon={<Lock className="w-4 h-4" />} 
            label="Security" 
            active={activeSection === "security"} 
            onClick={() => setActiveSection("security")}
          />
          <NavButton 
            icon={<Bell className="w-4 h-4" />} 
            label="Notifications" 
            active={activeSection === "notifications"} 
            onClick={() => setActiveSection("notifications")}
          />
          <NavButton 
            icon={<CreditCard className="w-4 h-4" />} 
            label="Subscription" 
            active={activeSection === "subscription"} 
            onClick={() => setActiveSection("subscription")}
          />
          
          <div className="pt-8 mt-8 border-t border-white/5 space-y-2 text-gray-500">
             <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 hover:text-rose-500 transition-all text-xs font-medium"
             >
               <LogOut className="w-4 h-4" />
               <span>Log Out</span>
             </button>
             <button 
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all text-xs font-medium"
             >
               <Trash2 className="w-4 h-4" />
               <span>Delete Account</span>
             </button>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 space-y-8">
          <AnimatePresence mode="wait">
            {activeSection === "account" && (
              <Section key="account" title="Account Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SettingInput label="Display Name" value={user?.name || "Anonymous User"} readOnly />
                  <SettingInput label="Registered Email" value={user?.email || "No email linked"} readOnly />
                  <SettingInput label="User ID" value={user?.id || "N/A"} readOnly />
                  <SettingInput label="Subscription Plan" value={user?.subscription_plan?.toUpperCase() || "FREE"} readOnly />
                </div>
                <div className="pt-6 border-t border-white/5">
                  <button 
                    onClick={() => navigate("/profile")}
                    className="flex items-center space-x-2 text-brand-primary hover:underline text-xs font-semibold"
                  >
                    <span>Update Full Profile</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </Section>
            )}

            {activeSection === "security" && (
              <Section key="security" title="Security Settings">
                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                    <div className="flex items-center space-x-4">
                      <div className="p-3 bg-brand-primary/10 rounded-xl">
                        <Smartphone className="w-5 h-5 text-brand-primary" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Two-Factor Authentication</h4>
                        <p className="text-gray-400 text-xs">Status: Deactivated</p>
                      </div>
                    </div>
                    <button className="text-xs font-semibold text-brand-primary hover:underline">Setup</button>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-white tracking-tight uppercase">Update Password</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative">
                        <SettingInput label="Current Password" type="password" placeholder="••••••••" />
                        <EyeOff className="absolute right-4 bottom-3.5 w-4 h-4 text-gray-600" />
                      </div>
                      <div className="relative">
                        <SettingInput label="New Password" type="password" placeholder="••••••••" />
                        <EyeOff className="absolute right-4 bottom-3.5 w-4 h-4 text-gray-600" />
                      </div>
                    </div>
                    <button 
                      onClick={() => toast.success("Password updated successfully Direct.")}
                      className="btn-primary py-3 px-6 w-max"
                    >
                      Update Password
                    </button>
                  </div>
                </div>
              </Section>
            )}

            {activeSection === "notifications" && (
              <Section key="notifications" title="Notification Preferences">
                <div className="space-y-4">
                  <ToggleRow 
                    icon={<Mail className="w-4 h-4" />} 
                    desc="Receive emails for matched opportunities."
                    active={notificationSettings.emailJobs}
                    onToggle={() => handleToggleNotification('emailJobs')}
                  />
                  <ToggleRow 
                    icon={<Zap className="w-4 h-4" />} 
                    desc="Push notifications for incoming direct messages."
                    active={notificationSettings.pushMessages}
                    onToggle={() => handleToggleNotification('pushMessages')}
                  />
                  <ToggleRow 
                    icon={<Globe className="w-4 h-4" />} 
                    desc="Weekly digest of student hiring trends in BD."
                    active={notificationSettings.emailMessages}
                    onToggle={() => handleToggleNotification('emailMessages')}
                  />
                </div>
              </Section>
            )}

            {activeSection === "subscription" && (
              <Section key="subscription" title="Subscription Status">
                 <div className="bento-card border-brand-primary/20 bg-brand-primary/5 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-2xl bg-brand-primary flex items-center justify-center text-white">
                             <Shield className="w-5 h-5" />
                          </div>
                          <div>
                             <h4 className="text-lg font-bold text-white">Standard Account</h4>
                             <p className="text-gray-400 text-xs">Basic Hiring & Swiping Enabled</p>
                          </div>
                       </div>
                       <button 
                        onClick={() => navigate("/pricing")}
                        className="btn-primary py-3 px-6 shadow-none"
                       >
                         Upgrade
                       </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Last Sync</p>
                          <p className="text-xs font-mono">2024-05-15 14:30 UTC</p>
                       </div>
                       <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                          <p className="text-[9px] font-black uppercase text-gray-500 mb-1">Cycle Reset</p>
                          <p className="text-xs font-mono italic">Continuous</p>
                       </div>
                    </div>
                 </div>
              </Section>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all text-sm font-medium text-left",
      active 
        ? "bg-brand-primary text-white" 
        : "text-gray-400 hover:text-white hover:bg-white/5"
    )}
  >
    {icon}
    <span>{label}</span>
  </button>
);

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    className="bento-card space-y-8"
  >
    <div className="space-y-1">
      <h3 className="text-xl font-bold tracking-tight text-white">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const SettingInput = ({ label, value, readOnly, type = "text", placeholder }: any) => (
  <div className="space-y-2">
    <label className="text-xs font-semibold text-gray-400 leading-none">{label}</label>
    <input 
      type={type}
      value={value}
      readOnly={readOnly}
      placeholder={placeholder}
      className={cn(
        "w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-primary transition-all text-white font-normal",
        readOnly && "opacity-50 cursor-not-allowed border-dashed"
      )}
    />
  </div>
);

const ToggleRow = ({ icon, label, desc, active, onToggle }: any) => (
  <div className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
    <div className="flex items-center space-x-4">
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-brand-primary/10 text-brand-primary border border-brand-primary/20" : "bg-white/5 text-gray-400"
      )}>
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-sm text-white tracking-tight">{label}</h4>
        <p className="text-xs text-gray-400 font-normal">{desc}</p>
      </div>
    </div>
    <button 
      onClick={onToggle}
      className={cn(
        "w-14 h-8 rounded-full p-1 transition-all duration-300 relative",
        active ? "bg-emerald-500" : "bg-gray-800"
      )}
    >
      <motion.div 
        animate={{ x: active ? 24 : 0 }}
        className="w-6 h-6 bg-white rounded-full shadow-lg"
      />
    </button>
  </div>
);

export default Settings;
