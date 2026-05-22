import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Zap, Crown, Shield, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  usageCount: number;
}

const SubscriptionModal = ({ isOpen, onClose, usageCount }: SubscriptionModalProps) => {
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-[#0D0D0D] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
          >
            {/* Header with Progress */}
            <div className="p-8 space-y-6 text-center border-b border-white/5 relative bg-gradient-to-b from-brand-primary/10 to-transparent">
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 hover:bg-white/5 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>

              <div className="w-20 h-20 bg-brand-primary/20 rounded-3xl mx-auto flex items-center justify-center animate-bounce">
                <Zap className="w-10 h-10 text-brand-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter">Posting Limit Reached</h2>
                <p className="text-gray-400 text-sm font-medium">You've used <span className="text-white">3/3</span> free monthly job posts.</p>
              </div>

              <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  className="h-full bg-brand-primary shadow-[0_0_15px_rgba(110,68,255,0.8)]"
                />
              </div>
            </div>

            {/* Plan Options */}
            <div className="p-8 space-y-4">
              <UpgradeOption 
                icon={<Zap className="text-brand-primary" />}
                title="Basic Plan"
                price="৳299/mo"
                description="Up to 10 job posts & employer analytics"
                onClick={() => {
                   onClose();
                   navigate('/pricing');
                }}
              />
              <UpgradeOption 
                highlight
                icon={<Crown className="text-amber-400" />}
                title="Pro Lifetime"
                price="৳799/mo"
                description="Unlimited posts & AI matching power"
                onClick={() => {
                  onClose();
                  navigate('/pricing');
               }}
              />
            </div>

            <div className="px-8 pb-8">
               <p className="text-[10px] text-gray-500 text-center font-bold uppercase tracking-[0.2em] mb-4">Secured with SSL Commerz</p>
               <button 
                 onClick={onClose}
                 className="w-full text-center text-[10px] font-black uppercase text-gray-600 hover:text-white transition-colors tracking-widest"
               >
                 Maybe Later
               </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const UpgradeOption = ({ icon, title, price, description, onClick, highlight }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full p-4 rounded-2xl flex items-center justify-between border transition-all text-left",
      highlight 
        ? "bg-brand-primary border-transparent text-white shadow-lg shadow-brand-primary/20" 
        : "bg-white/5 border-white/5 hover:border-white/10 text-white"
    )}
  >
    <div className="flex items-center space-x-4">
      <div className={cn("p-2 rounded-xl", highlight ? "bg-white/20" : "bg-white/5")}>
        {icon}
      </div>
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest leading-none mb-1">{title}</h4>
        <p className={cn("text-[10px] font-medium opacity-70")}>{description}</p>
      </div>
    </div>
    <div className="flex flex-col items-end">
      <span className="text-sm font-black italic">{price}</span>
      <ArrowRight className="w-3 h-3 mt-1 opacity-50" />
    </div>
  </button>
);

export default SubscriptionModal;
