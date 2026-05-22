import { useState, useEffect } from "react";
import { 
  ShieldAlert, ShieldCheck, Users, Eye, Trash2, 
  Flag, TrendingUp, Activity, BarChart3, Lock,
  AlertCircle, Search, Filter, Database, CreditCard,
  Crown, ArrowUpRight, XCircle, ExternalLink, FileText
} from "lucide-react";
import { cn } from "../utils/cn";
import { toast } from "sonner";

import { useAuth } from "../hooks/useAuth";

const AdminPanel = () => {
  const { apiFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<"verification" | "scams" | "analytics" | "subscriptions">("verification");
  const [verificationQueue, setVerificationQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'verification') {
      fetchQueue();
    }
  }, [activeTab]);

  const fetchQueue = async () => {
    setIsLoading(true);
    try {
      const res = await apiFetch("/api/admin/verifications");
      if (res.ok) {
        const data = await res.json();
        setVerificationQueue(data);
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAction = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      const res = await apiFetch("/api/admin/verify-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, status })
      });
      if (res.ok) {
        toast.success(`User ${status === 'verified' ? 'Approved' : 'Rejected'}`);
        fetchQueue();
      }
    } catch (err) {
      toast.error("Action failed");
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 pb-24">
      
      {/* Header Stat Row */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        <AdminStat label="Total Users" value="12,450" icon={<Users className="w-4 h-4 text-brand-primary" />} delta="+12%" />
        <AdminStat label="Verified" value="8,120" icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />} delta="+5%" />
        <AdminStat label="Pending Bans" value="14" icon={<ShieldAlert className="w-4 h-4 text-rose-500" />} />
        <AdminStat label="Live Shifts" value="124" icon={<Activity className="w-4 h-4 text-amber-500" />} />
      </div>

      {/* Tabs */}
      <div className="col-span-12 flex space-x-6 border-b border-white/5 pb-2">
        <AdminNav active={activeTab === 'verification'} onClick={() => setActiveTab('verification')}>Verification Queue ({verificationQueue.length})</AdminNav>
        <AdminNav active={activeTab === 'subscriptions'} onClick={() => setActiveTab('subscriptions')}>Subscriptions</AdminNav>
        <AdminNav active={activeTab === 'scams'} onClick={() => setActiveTab('scams')}>AI Scam Watch</AdminNav>
        <AdminNav active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')}>Eco Analytics</AdminNav>
      </div>

      <div className="col-span-12">
        <div className="bento-card p-0 overflow-hidden min-h-[600px]">
          {activeTab === 'verification' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">User ID</th>
                    <th className="px-6 py-4">Documents</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Date Submitted</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {verificationQueue.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic text-sm">
                        No pending verifications at the moment.
                      </td>
                    </tr>
                  ) : (
                    verificationQueue.map((item) => (
                      <VerificationRow 
                        key={item.id} 
                        item={item} 
                        onAction={(status: any) => handleVerifyAction(item.id, status)} 
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'subscriptions' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-[10px] uppercase font-bold text-gray-500 tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Employer</th>
                    <th className="px-6 py-4">Current Plan</th>
                    <th className="px-6 py-4">MRR (৳)</th>
                    <th className="px-6 py-4">Usage</th>
                    <th className="px-6 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <SubscriptionRow name="Grab Recruitment" plan="Pro" amount="799" usage="144 jobs" expiration="Active" />
                  <SubscriptionRow name="Daraz Team" plan="Basic" amount="299" usage="8/10 used" expiration="Expiring" warning />
                  <SubscriptionRow name="Foodpanda HR" plan="Pro" amount="799" usage="32 jobs" expiration="Active" />
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'scams' && (
            <div className="p-8 space-y-8">
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl font-black italic uppercase text-rose-500 flex items-center space-x-2">
                      <ShieldAlert className="w-6 h-6" />
                      <span>Flagged Listings</span>
                    </h3>
                    <p className="text-xs text-gray-400 font-bold uppercase">AI detected high scam probability in these recent posts.</p>
                  </div>
                  <button className="btn-outline border-rose-500/30 text-rose-500 text-[10px]">Mass Moderate (4)</button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ScamCard 
                    title="Work from home: Earn ৳ 50k weekly!" 
                    reason="Unrealistic salary + request for up-front processing fee."
                    score={94}
                    poster="Anonymous Recruit"
                  />
                  <ScamCard 
                    title="Student needed for simple crypto task" 
                    reason="Linked to known phising domains in description."
                    score={82}
                    poster="Ahmed Z."
                  />
               </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-8 space-y-8">
               <h3 className="text-xl font-black italic uppercase text-brand-primary flex items-center space-x-2">
                  <BarChart3 className="w-6 h-6" />
                  <span>Platform Ecosystem Analytics</span>
               </h3>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 border border-white/5 p-6 rounded-2xl h-80 flex items-end">
                    <div className="w-full flex items-end space-x-2 h-full pt-10">
                       {[40,70,50,90,30,60,85].map((h, i) => (
                         <div key={i} className="flex-1 bg-brand-primary/20 rounded-t-lg transition-all hover:bg-brand-primary" style={{ height: `${h}%` }}></div>
                       ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-4">
                     <AnalyticRow label="Match Success Ratio" value="74%" trend="+3%" />
                     <AnalyticRow label="Avg Response Time" value="14 Minutes" trend="-2m" positive />
                     <AnalyticRow label="Retention Rate" value="62%" trend="+8%" />
                     <AnalyticRow label="Fraud Prevention" value="99.9%" trend="Stable" />
                  </div>
               </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const AdminStat = ({ label, value, icon, delta }: any) => (
  <div className="bento-card flex items-center space-x-4 border-white/5 hover:border-brand-primary/30">
    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
      {icon}
    </div>
    <div>
      <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-1">{label}</p>
      <div className="flex items-center space-x-2">
        <span className="text-xl font-black italic">{value}</span>
        {delta && <span className="text-[10px] font-bold text-emerald-400">{delta}</span>}
      </div>
    </div>
  </div>
);

const AdminNav = ({ active, children, onClick }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "text-[10px] font-bold uppercase tracking-widest transition-all pb-2",
      active ? "text-white border-b-2 border-brand-primary" : "text-gray-500 hover:text-white"
    )}
  >
    {children}
  </button>
);

const VerificationRow = ({ item, onAction }: any) => (
  <tr className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0 cursor-default">
    <td className="px-6 py-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-xs uppercase">{item.id.slice(0, 2)}</div>
        <div>
          <p className="text-sm font-bold truncate max-w-[150px]">{item.id}</p>
          <p className="text-[10px] text-gray-500 uppercase font-bold">Audit Target</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <div className="flex items-center space-x-2">
        {item.nid_front_url && (
          <a 
            href={item.nid_front_url} 
            target="_blank" 
            rel="noreferrer" 
            className="text-[8px] font-black uppercase bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center space-x-1"
          >
            <Eye className="w-2 h-2" />
            <span>NID</span>
          </a>
        )}
        {item.resume_url && (
          <a 
            href={item.resume_url} 
            target="_blank" 
            rel="noreferrer" 
            className="text-[8px] font-black uppercase bg-violet-500/10 text-violet-400 px-2 py-1 rounded border border-violet-500/20 hover:bg-violet-500/20 transition-all flex items-center space-x-1"
          >
            <FileText className="w-2 h-2" />
            <span>Resume</span>
          </a>
        )}
      </div>
    </td>
    <td className="px-6 py-4">
      <span className="text-[10px] font-black uppercase text-amber-400 px-2 py-1 rounded bg-amber-400/10 border border-amber-400/20">
        {item.verification_status}
      </span>
    </td>
    <td className="px-6 py-4 text-xs font-bold text-gray-400">
      {new Date(item.created_at).toLocaleDateString()}
    </td>
    <td className="px-6 py-4 text-right">
       <div className="flex items-center justify-end space-x-2">
          <button 
            onClick={() => onAction('rejected')}
            className="p-2 bg-rose-500/10 text-rose-500 rounded-lg hover:bg-rose-500 transition-colors hover:text-white"
          >
            <XCircle className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onAction('verified')}
            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 transition-colors hover:text-white"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
       </div>
    </td>
  </tr>
);

const ScamCard = ({ title, reason, score, poster }: any) => (
  <div className="bg-rose-500/5 border border-rose-500/20 p-6 rounded-2xl flex flex-col justify-between space-y-4">
    <div className="space-y-4">
       <div className="flex justify-between items-start">
          <span className="text-rose-500 font-black italic">{score}% SCAM RISK</span>
          <span className="text-[10px] text-gray-500 font-bold uppercase">Poster: {poster}</span>
       </div>
       <h4 className="text-lg font-bold tracking-tight uppercase italic">{title}</h4>
       <p className="text-xs text-gray-400 leading-relaxed italic"><AlertCircle className="w-3 h-3 inline mr-1" />{reason}</p>
    </div>
    <div className="flex space-x-3 pt-4 border-t border-rose-500/10">
       <button className="flex-1 py-2 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider">Auto-Delete</button>
       <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-wider">Manual Review</button>
    </div>
  </div>
);

const AnalyticRow = ({ label, value, trend, positive }: any) => (
  <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
    <span className="text-[10px] font-bold uppercase text-gray-500">{label}</span>
    <div className="flex items-center space-x-4">
       <span className="text-lg font-black italic tracking-tight">{value}</span>
       <span className={cn("text-[10px] font-bold uppercase px-2 py-1 rounded", (positive || trend.startsWith('+')) ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400")}>
         {trend}
       </span>
    </div>
  </div>
);

const SubscriptionRow = ({ name, plan, amount, usage, expiration, warning }: any) => (
  <tr className="group hover:bg-white/[0.02] transition-colors border-b border-white/5 last:border-0 cursor-default">
    <td className="px-6 py-4">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">{name}</p>
          <p className="text-[10px] text-gray-500 uppercase font-bold">Employer ID: 821-X9</p>
        </div>
      </div>
    </td>
    <td className="px-6 py-4">
      <span className={cn(
        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
        plan === 'Pro' ? "bg-amber-500/20 text-amber-500" : "bg-brand-primary/20 text-brand-primary"
      )}>
        {plan}
      </span>
    </td>
    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-400">৳{amount}</td>
    <td className="px-6 py-4">
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase italic text-gray-500">{usage}</p>
        <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
          <div className="w-3/4 h-full bg-brand-primary"></div>
        </div>
      </div>
    </td>
    <td className="px-6 py-4 text-right">
       <div className="flex items-center justify-end space-x-2">
          <span className={cn("text-[10px] font-black uppercase italic tracking-widest", warning ? "text-amber-500" : "text-emerald-500")}>
            {expiration}
          </span>
          <button className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-white transition-colors"><ArrowUpRight className="w-4 h-4" /></button>
       </div>
    </td>
  </tr>
);

export default AdminPanel;
