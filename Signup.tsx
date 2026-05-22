import React, { useState } from "react";
import { motion } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Mail, 
  Lock, 
  User as UserIcon,
  Briefcase,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  Chrome,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const Signup = () => {
  const navigate = useNavigate();
  const { signup, user, loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "worker" as "employer" | "worker",
    companyName: ""
  });

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      if (user.onboarding_completed) {
        navigate(user.role === 'employer' ? '/employer' : '/dashboard');
      } else {
        navigate("/onboarding");
      }
    }
  }, [user, navigate]);

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error("Full name is required");
      return false;
    }
    if (formData.role === 'employer' && !formData.companyName.trim()) {
      toast.error("Company name is required for employers");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      toast.error("Valid email is required");
      return false;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      await signup({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        role: formData.role,
        companyName: formData.role === 'employer' ? formData.companyName : undefined
      });
      // Signup success handled in AuthContext (sets user, redirects via useEffect)
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      // toast handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] space-y-8 p-4 bg-gradient-to-b from-bg-dark to-black/50">
      <div className="text-center space-y-4 max-w-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-4"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>Join the Revolution</span>
        </motion.div>
        <h2 className="text-4xl font-black italic tracking-tight">
          Create Account
        </h2>
        <p className="text-gray-400 text-sm">
          Join the elite workforce. We'll send a 6-digit security code to your email.
        </p>
      </div>

      <motion.div 
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-brand-primary/5 backdrop-blur-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="John Doe"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">I am a...</label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'worker'})}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all relative overflow-hidden group",
                    formData.role === 'worker' 
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_20px_rgba(110,68,255,0.15)]' 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                  )}
                >
                  <GraduationCap className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Student</span>
                  {formData.role === 'worker' && (
                    <motion.div layoutId="role-indicator" className="absolute top-2 right-2">
                      <CheckCircle2 className="w-3 h-3" />
                    </motion.div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, role: 'employer'})}
                  className={cn(
                    "p-4 rounded-2xl border flex flex-col items-center justify-center space-y-2 transition-all relative overflow-hidden group",
                    formData.role === 'employer' 
                      ? 'bg-brand-primary/20 border-brand-primary text-brand-primary shadow-[0_0_20px_rgba(110,68,255,0.15)]' 
                      : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                  )}
                >
                  <Briefcase className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-tighter">Employer</span>
                  {formData.role === 'employer' && (
                    <motion.div layoutId="role-indicator" className="absolute top-2 right-2">
                      <CheckCircle2 className="w-3 h-3" />
                    </motion.div>
                  )}
                </button>
              </div>
            </div>

            {formData.role === 'employer' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-2"
              >
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Company Entity Name</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="e.g. Acme Corporation"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all"
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>
              </motion.div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input 
                  type="email" 
                  placeholder="john@example.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Confirm</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    placeholder="••••••••"
                    required
                    className={cn(
                      "w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none transition-all",
                      formData.confirmPassword && formData.password !== formData.confirmPassword ? "border-rose-500/50" : "focus:border-brand-primary"
                    )}
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(110,68,255,0.3)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 group mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative px-4 bg-bg-dark text-[10px] font-black uppercase text-gray-600 tracking-tighter">or sign up with</span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
          >
            <Chrome className="w-5 h-5 text-brand-primary" />
            <span>Google Account</span>
          </button>

          <div className="text-center pt-2">
            <Link 
              to="/login"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Already have an account? Login
            </Link>
          </div>
        </form>
      </motion.div>

      <div className="pt-4 flex items-center justify-center space-x-2 text-[10px] font-bold uppercase text-gray-600">
        <ShieldCheck className="w-4 h-4" />
        <span>Enterprise JWT Verification & SSL Encryption</span>
      </div>
    </div>
  );
};

export default Signup;
