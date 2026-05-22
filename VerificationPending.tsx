import React, { useState, useEffect } from "react";
import { Mail, Loader2, ArrowLeft, ShieldCheck, RefreshCw, Zap, Clock } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const VerificationPending = () => {
  const navigate = useNavigate();
  const { user, apiFetch, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60); // Initialize with 60s
  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    if (user && !hasInitialized) {
       setHasInitialized(true);
       startCooldown(60);
       // Auto-send is usually handled by signup, but we can verify it was sent or resend if needed
    }
  }, [user]);

  const startCooldown = (seconds: number) => {
    setCooldown(seconds);
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = [
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
    React.useRef<HTMLInputElement>(null),
  ];

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newOtp = [...otp];
    // Handle paste of whole code
    if (value.length > 1) {
        const pasted = value.slice(0, 6).split("");
        for (let i = 0; i < pasted.length && i < 6; i++) {
            newOtp[i] = pasted[i];
        }
        setOtp(newOtp);
        const nextIndex = Math.min(newOtp.length - 1, pasted.length);
        inputRefs[nextIndex].current?.focus();
        return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").trim();
    if (!/^\d+$/.test(pastedData)) return;
    
    const pasted = pastedData.slice(0, 6).split("");
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length && i < 6; i++) {
        newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const focusIndex = Math.min(5, pasted.length);
    inputRefs[focusIndex].current?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const code = otp.join("");
    if (code.length < 6) {
      toast.error("Please enter the full 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, otp: code })
      });

      if (res.ok) {
        toast.success("Identity Verified. Initializing environment...");
        await refreshUser();
        navigate(user?.role === 'employer' ? '/employer' : '/dashboard');
      } else {
        const error = await res.json();
        toast.error(error.error || "Verification failed");
      }
    } catch (err) {
      toast.error("Network synchronization error");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email })
      });
      if (res.ok) {
        toast.success("Security code redeployed!");
        startCooldown(60);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to resend code");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 py-12 text-center text-white bg-[#050505]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg p-10 bg-[#0A0A0A] border border-white/5 rounded-[48px] space-y-10 shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
        
        <div className="space-y-4 relative z-10">
          <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-brand-primary" />
          </div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Verify Identity_</h2>
          <p className="text-gray-500 text-[11px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-xs mx-auto">
            Code expires in 10 minutes // Secure Link v4.2
          </p>
          {(import.meta as any).env.VITE_PAYMENT_ENABLED !== 'true' && (
            <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-xl p-3 mt-4">
              <p className="text-brand-primary text-[9px] font-black uppercase tracking-widest animate-pulse">
                Developer Bypass Active: Use 000000
              </p>
            </div>
          )}
          <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest pt-2">
            Target: {user?.email}
          </p>
        </div>

        <div className="flex justify-between gap-3 relative z-10">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={inputRefs[idx]}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="w-full h-16 bg-white/[0.03] border border-white/10 rounded-2xl text-center text-2xl font-black italic outline-none focus:border-brand-primary focus:bg-brand-primary/5 transition-all"
            />
          ))}
        </div>

        <div className="space-y-4 pt-4 relative z-10">
          <button 
            onClick={handleVerifyOtp}
            disabled={loading || otp.join("").length < 6}
            className="w-full py-5 bg-brand-primary text-white rounded-3xl text-[12px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5 fill-current" />}
            <span>Unlock Environment</span>
          </button>

          <div className="pt-2">
            <button 
              onClick={handleResend}
              disabled={loading || cooldown > 0}
              className="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-white transition-all disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend Available in ${cooldown}s` : "Request New Security Code_"}
            </button>
          </div>
        </div>

        <div className="pt-10 flex items-center justify-center space-x-3 text-[9px] text-gray-800 font-black uppercase tracking-[0.3em]">
          <div className="h-px flex-1 bg-white/5" />
          <span className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Encrypted Protocol v4.2
          </span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
      </motion.div>
    </div>
  );
};

export default VerificationPending;
