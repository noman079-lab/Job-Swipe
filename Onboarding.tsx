import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Briefcase, GraduationCap, ArrowRight, Building, CheckCircle, Search, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BANGLADESH_UNIVERSITIES } from "../constants/universities";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, refreshUser, apiFetch } = useAuth();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<'student' | 'employer' | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    org: "", // University or Company
  });
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const endpoint = role === 'student' ? '/api/misc/universities' : '/api/misc/companies';
      const res = await apiFetch(`${endpoint}?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRole = (r: 'student' | 'employer') => {
    setRole(r);
    setStep(2);
  };

  const handleFinalize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("User not found. Please login again.");
      return;
    }

    setLoading(true);
    try {
      const dbRole = role === 'student' ? 'worker' : 'employer';
      const res = await apiFetch("/api/misc/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          role: dbRole,
          organization: formData.org,
          university: role === 'student' ? formData.org : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile finalized! 🚀");
        await refreshUser();
        navigate(role === 'student' ? '/dashboard' : '/employer');
      } else {
        toast.error(data.error || "Failed to save profile");
      }
    } catch (err) {
      toast.error("Connection error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] py-12 px-4">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-4xl space-y-12 text-center"
          >
            <div className="space-y-4">
              <h2 className="text-4xl font-black italic tracking-tight">Choose Your Path</h2>
              <p className="text-gray-400 max-w-md mx-auto italic uppercase text-[10px] font-bold tracking-widest">
                Job Seeker or Talent Hunter?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <RoleOption 
                icon={<GraduationCap className="w-12 h-12 text-violet-500" />}
                title="I am a Student"
                description="Find tuition, internships, and build your career XP."
                onClick={() => handleSelectRole('student')}
              />
              <RoleOption 
                icon={<Briefcase className="w-12 h-12 text-fuchsia-500" />}
                title="I am an Employer"
                description="Hire the best university talent in Bangladesh instantly."
                onClick={() => handleSelectRole('employer')}
              />
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md space-y-8"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black italic tracking-tight">Complete Profile</h2>
              <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest italic">One last step to start swiping</p>
            </div>

            <form onSubmit={handleFinalize} className="bento-card space-y-6 relative">
              <div className="space-y-4">
                <InputGroup 
                  label="Full Name" 
                  icon={<User className="w-4 h-4 text-brand-primary" />}
                  placeholder="Enter your name"
                  value={formData.name}
                  onChange={(e: any) => setFormData({...formData, name: e.target.value})}
                />
                
                <div className="relative">
                  <InputGroup 
                    label={role === 'student' ? "University" : "Company / Organization"} 
                    icon={role === 'student' ? <GraduationCap className="w-4 h-4 text-violet-400" /> : <Building className="w-4 h-4 text-fuchsia-400" />}
                    placeholder={role === 'student' ? "Start typing university name..." : "e.g. Pathao"}
                    value={formData.org}
                    onChange={(e: any) => {
                      setFormData({...formData, org: e.target.value});
                      fetchSuggestions(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                  />
                  
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute z-50 w-full mt-2 bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden shadow-2xl"
                    >
                      {suggestions.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setFormData({...formData, org: item.name});
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-4 py-3 text-xs font-bold text-gray-400 hover:bg-brand-primary/10 hover:text-brand-primary transition-colors border-b border-white/5 last:border-0 flex items-center space-x-2"
                        >
                          <Search className="w-3 h-3 opacity-50" />
                          <span>{item.name} {item.short_name ? `(${item.short_name})` : ''}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                <p className="text-[10px] font-bold text-emerald-400 uppercase leading-none">Your identity will be verified soon</p>
              </div>

              <button 
                type="submit" 
                disabled={!formData.name || !formData.org || loading}
                className="w-full btn-primary shadow-brand-primary/20 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                <div className="flex items-center justify-center space-x-2">
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Enter Marketplace</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const RoleOption = ({ icon, title, description, onClick }: any) => (
  <motion.button 
    whileHover={{ y: -8 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="bento-card text-left flex flex-col items-start space-y-6 group cursor-pointer border-white/5 hover:border-brand-primary/30"
  >
    <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-brand-primary/10 transition-colors">
      {icon}
    </div>
    <div className="space-y-2">
      <h3 className="text-2xl font-black italic tracking-tight">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
    <div className="mt-auto pt-6 flex items-center text-brand-primary font-bold text-[10px] uppercase tracking-widest space-x-2 group-hover:translate-x-2 transition-transform">
      <span>Continue</span>
      <ArrowRight className="w-4 h-4" />
    </div>
  </motion.button>
);

const InputGroup = ({ label, icon, placeholder, value, onChange, onFocus }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-bold uppercase text-gray-500 tracking-widest italic">{label}</label>
    <div className="relative group">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-brand-primary transition-colors">
        {icon}
      </div>
      <input 
        type="text" 
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onFocus={onFocus}
        required
        className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-sm outline-none focus:border-brand-primary transition-all font-bold placeholder:font-normal placeholder:text-gray-600"
      />
    </div>
  </div>
);

export default Onboarding;
