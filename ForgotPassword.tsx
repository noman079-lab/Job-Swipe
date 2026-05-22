import React, { useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { 
  Mail, 
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Zap,
  Loader2,
  CheckCircle2
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSubmitted(true);
      // In this preview build, we show the reset token for testing convenience
      if (data.resetToken) setResetToken(data.resetToken);
      
      toast.success("Reset link sent! 📧");
    } catch (err: any) {
      toast.error(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 bg-gradient-to-b from-bg-dark to-black/50">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-brand-primary/20 border border-brand-primary/30 text-brand-primary mb-4"
          >
            <ShieldCheck className="w-8 h-8" />
          </motion.div>
          <h2 className="text-4xl font-black italic tracking-tight">Recover Access</h2>
          <p className="text-gray-400 text-sm">
            Enter the email associated with your account and we'll send a secure reset link.
          </p>
        </div>

        <motion.div 
          layout
          className="bg-white/[0.02] border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl"
        >
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-gray-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="email" 
                    placeholder="john@example.com"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm outline-none focus:border-brand-primary transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
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
                    <span>Send Reset Link</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link 
                  to="/login"
                  className="inline-flex items-center space-x-2 text-xs font-bold text-gray-500 hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold">Check your Inbox</h3>
                <p className="text-sm text-gray-400">If an account exists for {email}, you'll receive a password reset link shortly.</p>
              </div>

              {resetToken && (
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-left">
                  <p className="text-[10px] font-black uppercase text-gray-500 mb-2">Debug Mode: Simulation Link</p>
                  <Link 
                    to={`/reset-password?token=${resetToken}`}
                    className="text-xs font-mono text-brand-primary break-all hover:underline"
                  >
                    <span>Click here to simulate reset -&gt;</span>
                  </Link>
                </div>
              )}

              <button 
                onClick={() => setSubmitted(false)}
                className="w-full py-4 rounded-2xl border border-white/10 hover:bg-white/5 text-sm font-bold transition-all"
              >
                Try different email
              </button>
            </motion.div>
          )}
        </motion.div>

        <div className="pt-4 flex items-center justify-center space-x-2 text-[10px] font-bold uppercase text-gray-600">
          <Zap className="w-4 h-4" />
          <span>Powered by Enterprise Security Protocols</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
