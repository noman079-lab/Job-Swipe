import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Zap, Shield, Sparkles, Rocket, Crown, ArrowRight, Loader2, X, CreditCard, PartyPopper } from "lucide-react";
import { cn } from "../utils/cn";
import { useNavigate, useSearchParams } from "react-router-dom";
import { subscriptionService } from "../services/subscriptionService";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();
  const currentUserId = user?.id || "temp-user-id";
  const [loading, setLoading] = useState<string | null>(null);
  const [activeOrder, setActiveOrder] = useState<{ id: string, plan: string, amount: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"bKash" | "Nagad" | "Rocket">("bKash");
  const [transactionId, setTransactionId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const phoneNumbers = {
    bKash: "01788-990011 (Personal)",
    Nagad: "01977-882233 (Personal)",
    Rocket: "01566-778899 (Personal)"
  };

  const handleUpgradeInitiate = async (plan: string, price: string) => {
    if (!user) {
       toast.error("Please login to upgrade your plan");
       return;
    }

    setLoading(plan);
    const amount = parseInt(price.replace('৳', ''));
    
    try {
      const res = await subscriptionService.createOrder(currentUserId, plan.toLowerCase(), amount);

      if (res.success && res.orderId) {
        setActiveOrder({ id: res.orderId, plan, amount });
        setTransactionId("");
        toast.success(`Order created! Pay to our ${paymentMethod} number and enter TrxID below.`);
      } else {
        toast.error(res.error || "Failed to create payment order");
      }
    } catch (err) {
      console.error(err);
      toast.error("Integration failed");
    } finally {
      setLoading(null);
    }
  };

  const handleVerify = async () => {
    if (!transactionId || transactionId.trim().length < 8) {
      toast.error("Please enter a valid Transaction ID (min 8 chars)");
      return;
    }

    setVerifying(true);
    try {
      const res = await subscriptionService.verifyPayment(currentUserId, activeOrder!.id, transactionId, paymentMethod);
      if (res.success) {
        toast.success(`Success! Account upgraded to ${activeOrder!.plan}! 🚀`);
        setActiveOrder(null);
        await refreshUser();
        setIsSuccess(true);
      } else {
        toast.error(res.error || "Verification failed. Please ensure the TrxID is correct.");
      }
    } catch (err) {
      toast.error("Verification error");
    } finally {
      setVerifying(false);
    }
  };

  const isPaymentEnabled = true;

  return (
    <div className="max-w-7xl mx-auto px-4 py-20 space-y-20 relative overflow-hidden">
      <AnimatePresence>
        {(activeOrder || verifying || isSuccess) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#000000] border border-white/10 rounded-[40px] p-8 md:p-12 max-w-xl w-full shadow-2xl space-y-8 relative overflow-hidden"
            >
              {verifying ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-6">
                  <Loader2 className="w-16 h-16 text-brand-primary animate-spin" />
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-black italic uppercase tracking-tighter">Verifying Transaction</h2>
                    <p className="text-gray-400 text-sm">Validating Mobile wallet records with DB ledger...</p>
                  </div>
                </div>
              ) : isSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 space-y-6 text-center">
                  <div className="p-6 bg-emerald-500/20 rounded-full">
                    <PartyPopper className="w-16 h-16 text-emerald-400" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">UPGRADE COMPLETED!</h2>
                    <p className="text-gray-400 text-lg">Your features are now fully enabled.</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsSuccess(false);
                      navigate('/employer');
                    }}
                    className="w-full py-5 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/40"
                  >
                    Go to Employer Panel
                  </button>
                </div>
              ) : activeOrder && (
                <>
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand-primary/20">
                    <motion.div 
                      className="h-full bg-brand-primary"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                    />
                  </div>

                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter">Mobile bKash / Nagad / Rocket</h2>
                      <p className="text-gray-400 text-sm font-medium">Step 2: Transfer and match Transaction ID</p>
                    </div>
                    <button 
                      onClick={() => setActiveOrder(null)}
                      className="p-2 hover:bg-white/5 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-gray-500" />
                    </button>
                  </div>

                  {/* Gateway selector tabs */}
                  <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/5">
                    {(["bKash", "Nagad", "Rocket"] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={cn(
                          "py-3 text-xs font-black uppercase rounded-lg transition-all",
                          paymentMethod === method 
                            ? "bg-brand-primary text-white shadow-md shadow-brand-primary/20"
                            : "text-gray-400 hover:text-white"
                        )}
                      >
                        {method}
                      </button>
                    ))}
                  </div>

                  <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-3xl p-6 flex items-start space-x-4">
                    <div className="p-3 bg-brand-primary/20 rounded-2xl">
                      <CreditCard className="w-6 h-6 text-brand-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-black uppercase text-gray-500 tracking-widest">Amount to Pay</p>
                      <p className="text-2xl font-black italic text-brand-primary">৳{activeOrder.amount}</p>
                      <p className="text-[10px] font-black uppercase text-white/50 tracking-wider">
                        Send Money To: <span className="text-emerald-400 font-bold">{phoneNumbers[paymentMethod]}</span>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] ml-2 italic">TrxID / Transaction Reference</label>
                      <input 
                        type="text" 
                        placeholder="Enter 8-digit TrxID (e.g. 5TR8A92K)"
                        value={transactionId}
                        onChange={(e) => setTransactionId(e.target.value.toUpperCase())}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-6 text-xl font-black italic tracking-widest uppercase outline-none focus:border-brand-primary transition-all placeholder:text-gray-800"
                      />
                    </div>
                    
                    <p className="text-[10px] text-gray-500 font-medium italic text-center px-4 leading-relaxed">
                      Please allow up to 1 minute for automatic matching. Attempting fraudulent submissions will lead to instant ban.
                    </p>

                    <button 
                      onClick={handleVerify}
                      disabled={verifying}
                      className="w-full py-5 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-brand-primary/40 flex items-center justify-center space-x-3 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                    >
                      {verifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing verification...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify TrxID</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background Glows */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-brand-primary/5 blur-[100px] -z-10 rounded-full"></div>

      <div className="text-center space-y-6 max-w-3xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-brand-primary"
        >
          <Sparkles className="w-3 h-3" />
          <span>Secure Professional Upgrades</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter leading-none"
        >
          Scale Your <span className="text-brand-primary">Hiring</span>
        </motion.h1>
        
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-gray-400 text-lg md:text-xl font-medium max-w-2xl mx-auto"
        >
          Verified Professional Subscriptions. Choose a plan that fits your business needs. 
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch pt-10">
        {/* FREE PLAN */}
        <PriceCard 
          plan="Free"
          price="৳0"
          period="Forever"
          description="Perfect for testing the waters and small urgent tasks."
          features={[
            "3 job posts per month",
            "Basic job visibility",
            "Standard ranking",
            "Real-time matches",
            "Chat instantly"
          ]}
          onSelect={() => navigate('/create-job')}
          icon={<Shield className="w-6 h-6 text-emerald-400" />}
          buttonText="Current Plan"
        />

        {/* BASIC PLAN */}
        <PriceCard 
          highlight
          plan="Basic"
          price="৳299"
          period="/month"
          description="For growing teams needing more visibility and control."
          features={[
            "10 job posts per month",
            "Access to Employer Dashboard",
            "Job visibility boost (1/mo)",
            "Repost expired jobs",
            "Standard analytics",
            "Basic support"
          ]}
          onSelect={() => handleUpgradeInitiate('Basic', '৳299')}
          loading={loading === 'Basic'}
          icon={<Zap className="w-6 h-6 text-brand-primary" />}
        />

        {/* PRO PLAN */}
        <PriceCard 
          plan="Pro"
          price="৳799"
          period="/month"
          description="Unlimited potential for high-volume hiring engines."
          features={[
            "Unlimited job posts",
            "AI Candidate Suggestions",
            "Priority Swipe Feed placement",
            "Advanced Analytics Dashboard",
            "Bulk hiring tools",
            "Priority Support 24/7"
          ]}
          onSelect={() => handleUpgradeInitiate('Pro', '৳799')}
          loading={loading === 'Pro'}
          icon={<Crown className="w-6 h-6 text-amber-400" />}
          gradient="from-amber-400/20 to-orange-600/20"
        />
      </div>
      
      {/* Comparison Table for Desktop */}
      <div className="hidden lg:block pt-32">
        <h2 className="text-2xl font-black uppercase italic mb-12 flex items-center space-x-3">
          <Rocket className="w-6 h-6 text-brand-primary" />
          <span>Feature Comparison</span>
        </h2>
        <div className="border border-white/10 rounded-[40px] overflow-hidden bg-white/1 backdrop-blur-3xl">
           <table className="w-full text-left">
             <thead>
               <tr className="border-b border-white/10">
                 <th className="p-8 text-[10px] uppercase font-black text-gray-500 tracking-widest">Capability</th>
                 <th className="p-8 text-[11px] uppercase font-black">Free</th>
                 <th className="p-8 text-[11px] uppercase font-black">Basic</th>
                 <th className="p-8 text-[11px] uppercase font-black text-brand-primary">Pro</th>
               </tr>
             </thead>
             <tbody>
               <ComparisonRow label="Monthly Job Posts" free="3" basic="10" pro="Unlimited" />
               <ComparisonRow label="AI Suggestions" free={false} basic={false} pro={true} />
               <ComparisonRow label="Swipe Feed Priority" free="Low" basic="Standard" pro="High" />
               <ComparisonRow label="Analytics" free="Basic" basic="Standard" pro="Advanced" />
               <ComparisonRow label="Active Boosts" free="0" basic="1 included" pro="Unlimited" />
             </tbody>
           </table>
        </div>
      </div>
    </div>
  );
};

const ComparisonRow = ({ label, free, basic, pro }: any) => (
  <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
    <td className="p-8 text-sm font-bold text-gray-300">{label}</td>
    <td className="p-8 text-xs font-mono">{typeof free === 'boolean' ? (free ? <Check className="text-emerald-400 w-4 h-4" /> : "—") : free}</td>
    <td className="p-8 text-xs font-mono">{typeof basic === 'boolean' ? (basic ? <Check className="text-emerald-400 w-4 h-4" /> : "—") : basic}</td>
    <td className="p-8 text-xs font-mono text-brand-primary">{typeof pro === 'boolean' ? (pro ? <Check className="text-brand-primary w-4 h-4" /> : "—") : pro}</td>
  </tr>
);

const PriceCard = ({ plan, price, period, description, features, onSelect, highlight, icon, gradient, loading, buttonText }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className={cn(
      "relative p-10 rounded-[32px] border flex flex-col justify-between transition-all group bg-card-bg",
      highlight 
        ? "border-brand-primary/30 shadow-xl ring-1 ring-brand-primary/10 shadow-brand-primary/5" 
        : "border-card-border hover:border-white/10",
      gradient && `bg-gradient-to-b ${gradient}`
    )}
  >
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="p-3 bg-white/5 rounded-2xl border border-white/10 group-hover:scale-110 transition-transform">
          {icon}
        </div>
        {highlight && (
          <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-brand-primary text-white rounded-full">Best Value</span>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">{plan}</h3>
        <div className="flex items-baseline space-x-1">
          <span className="text-5xl font-black italic tracking-tighter">{price}</span>
          <span className="text-sm text-gray-500 font-bold uppercase">{period}</span>
        </div>
        <p className="text-sm text-gray-400 leading-relaxed font-medium">
          {description}
        </p>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        {features.map((f: string, i: number) => (
          <div key={i} className="flex items-center space-x-3 text-xs font-bold text-gray-300">
            <div className="w-5 h-5 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Check className="w-3 h-3 text-emerald-400" />
            </div>
            <span>{f}</span>
          </div>
        ))}
      </div>
    </div>

    <button 
      onClick={onSelect}
      disabled={loading}
      className={cn(
        "mt-10 w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center space-x-2 transition-all",
        highlight 
          ? "bg-brand-primary text-white shadow-xl shadow-brand-primary/30 hover:scale-[1.02] active:scale-95" 
          : "bg-white/5 text-white border border-white/10 hover:bg-white/10",
        loading && "opacity-50"
      )}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting...</span>
        </>
      ) : (
        <>
          <span>{buttonText || (plan === 'Free' ? 'Get Started' : `Proceed to Payment`)}</span>
          <ArrowRight className="w-4 h-4" />
        </>
      )}
    </button>
  </motion.div>
);

export default Pricing;
