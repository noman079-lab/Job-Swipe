import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
  Phone,
  Chrome,
  KeyRound
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { ConfirmationResult } from "firebase/auth";

const Login = () => {
  const navigate = useNavigate();
  const { login, signup, user, loginWithGoogle, requestOTP, verifyOTP, forgotPassword } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    phone: "+880",
    role: "worker" as "employer" | "worker"
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMethod === 'email') {
        if (isLogin) {
          await login(formData.email, formData.password);
        } else {
          await signup({
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role
          });
        }
      } else {
        // Phone Auth
        if (!otpSent) {
          const result = await requestOTP(formData.phone);
          setConfirmationResult(result);
          setOtpSent(true);
          toast.success("Security code dispatched via SMS!");
        } else {
          await verifyOTP(confirmationResult!, otpCode, formData.role);
        }
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      // toast handled in AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email) {
      toast.error("Please enter your email first");
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(formData.email);
    } catch (err) {
      // toast handled
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] space-y-8 p-4 bg-gradient-to-b from-bg-dark to-black/50">
      <div className="text-center space-y-4 max-w-sm">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-[10px] font-bold uppercase tracking-widest mb-4"
        >
          <Zap className="w-4 h-4 fill-current" />
          <span>{isLogin ? 'Welcome Back' : 'Join the Revolution'}</span>
        </motion.div>
        <h2 className="text-4xl font-black italic tracking-tight italic">
          {isLogin ? 'Login to Job Swipe' : 'Create Account'}
        </h2>
        <p className="text-gray-400 text-sm">
          {isLogin 
            ? "Your next big break is just a swipe away. Log in to continue." 
            : "Sign up to start swiping through the best jobs for students in Bangladesh."}
        </p>
      </div>

      <motion.div 
        layout
        className="w-full max-w-md bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-brand-primary/5 backdrop-blur-2xl"
      >
        <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
          <button 
            onClick={() => { setAuthMethod('email'); setOtpSent(false); }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'email' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Email Login
          </button>
          <button 
            onClick={() => { setAuthMethod('phone'); }}
            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${authMethod === 'phone' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Phone Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="wait">
            {(!isLogin || authMethod === 'phone') && (
              <motion.div 
                key="signup-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                {!isLogin && authMethod === 'email' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Full Name</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="John Doe"
                        required={!isLogin}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Target Account Role</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'worker'})}
                      className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 transition-all ${
                        formData.role === 'worker' 
                          ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' 
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      <span className="text-xs font-bold">Student</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, role: 'employer'})}
                      className={`p-3 rounded-2xl border flex items-center justify-center space-x-2 transition-all ${
                        formData.role === 'employer' 
                          ? 'bg-brand-primary/20 border-brand-primary text-brand-primary' 
                          : 'bg-white/5 border-white/10 text-gray-500 hover:border-white/20'
                      }`}
                    >
                      <Briefcase className="w-4 h-4" />
                      <span className="text-xs font-bold">Employer</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {authMethod === 'email' ? (
              <>
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase text-gray-500">Password</label>
                    {isLogin && (
                      <Link 
                        to="/forgot-password"
                        className="text-[10px] font-bold text-brand-primary hover:text-brand-secondary transition-colors"
                      >
                        Reset it?
                      </Link>
                    )}
                  </div>
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
              </>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="tel" 
                      placeholder="+8801XXXXXXXXX"
                      required
                      disabled={otpSent}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none focus:border-brand-primary transition-all disabled:opacity-50"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                </div>

                {otpSent && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Verification Code</label>
                    <div className="relative">
                      <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input 
                        type="text" 
                        placeholder="123456"
                        required
                        maxLength={6}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm outline-none tracking-widest font-black focus:border-brand-primary transition-all text-center"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-4 rounded-2xl shadow-[0_10px_30px_rgba(110,68,255,0.3)] flex items-center justify-center space-x-2 transition-all disabled:opacity-50 group"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{otpSent ? 'Verify Code' : (isLogin ? 'Login Now' : 'Create Account')}</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>

          <div className="relative py-4 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <span className="relative px-4 bg-bg-dark text-[10px] font-black uppercase text-gray-600 tracking-tighter">or continue with</span>
          </div>

          <button 
            type="button" 
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all disabled:opacity-50"
          >
            <Chrome className="w-5 h-5 text-brand-primary" />
            <span>Google Account</span>
          </button>

          <div className="text-center">
            <Link 
              to="/signup"
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Don't have an account? Sign up
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

export default Login;
