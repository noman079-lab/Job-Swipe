import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Briefcase, Clock, CheckCircle2, XCircle, ChevronRight, Search, Filter, Loader2, Mail } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

const Applications = () => {
  const { apiFetch } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [hiringRequests, setHiringRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [appsRes, reqsRes] = await Promise.all([
        apiFetch("/api/jobs/my-applications"),
        apiFetch("/api/user/hiring-requests")
      ]);
      
      if (appsRes.ok) setApplications(await appsRes.json());
      if (reqsRes.ok) setHiringRequests(await reqsRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRequestAction = async (id: string, status: 'accepted' | 'declined') => {
    try {
      const res = await apiFetch(`/api/user/hiring-requests/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'rejected': return 'text-rose-400 bg-rose-400/10 border-rose-400/20';
      case 'interviewing': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-6 text-left">
      <header className="space-y-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-white">Application Ledger</h1>
          <p className="text-xs text-gray-400">Review status logs of submitted applications and incoming employer offers.</p>
        </div>
        
        <div className="flex bg-[#111827] p-1 rounded-lg border border-white/[0.06] w-full md:w-fit overflow-x-auto">
          <button 
            onClick={() => setActiveTab('sent')}
            className={cn(
              "flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded transition-all min-w-fit",
              activeTab === 'sent' ? "bg-brand-primary text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Applications Sent ({applications.length})
          </button>
          <button 
            onClick={() => setActiveTab('received')}
            className={cn(
              "flex-1 md:flex-none px-4 py-2 text-xs font-semibold rounded transition-all relative min-w-fit",
              activeTab === 'received' ? "bg-brand-primary text-white" : "text-gray-400 hover:text-white"
            )}
          >
            Direct Job Offers ({hiringRequests.length})
            {hiringRequests.some(r => r.status === 'pending') && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-pulse border-2 border-[#111827]"></span>
            )}
          </button>
        </div>
      </header>
      
      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative group text-left">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder={activeTab === 'sent' ? "Search sent job openings..." : "Search incoming inquiries..."} 
            className="w-full bg-[#111827] border border-white/10 rounded-lg py-3 pl-11 pr-4 text-xs font-sans focus:outline-none focus:border-brand-primary/50 transition-all text-white font-medium placeholder:text-gray-600"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            <p className="text-xs text-gray-500 font-semibold">Updating history dashboard records...</p>
        </div>
      ) : activeTab === 'sent' ? (
        <div className="grid gap-3">
          {applications.map((app, idx) => (
            <motion.div
              key={`${app.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-[#111827] border border-white/[0.06] rounded-xl group relative overflow-hidden text-left"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-gray-300">
                    {app.company_name?.[0] || 'J'}
                  </div>
                  <div className="space-y-1 text-left">
                    <h3 className="text-base font-bold text-white leading-tight">{app.title}</h3>
                    <p className="text-xs text-gray-400 font-medium">{app.company_name} &bull; <span className="text-gray-500 font-normal">{app.location}</span></p>
                    <div className="flex items-center space-x-3 pt-1">
                        <div className="flex items-center space-x-1 text-[10px] text-gray-500 font-semibold">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Applied {new Date(app.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:flex-col md:items-end gap-2 text-left">
                  <span className={cn(
                    "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border",
                    getStatusColor(app.status)
                  )}>
                    {app.status}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
          {applications.length === 0 && (
             <div className="py-16 bg-[#111827] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center space-y-3">
              <Briefcase className="w-8 h-8 text-gray-600" />
              <p className="text-xs text-gray-500 font-medium">You have not submitted any applications yet.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {hiringRequests.map((req, idx) => (
            <motion.div
              key={`${req.id}-${idx}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-4 bg-[#111827] border border-white/[0.06] rounded-xl group relative overflow-hidden text-left"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold text-gray-300 overflow-hidden">
                    {req.employer_image ? <img src={req.employer_image} className="w-full h-full object-cover" /> : req.employer_name?.[0] || 'E'}
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="flex items-center space-x-2">
                       <h3 className="text-base font-bold text-white leading-tight">
                         {req.type === 'elite' ? 'Premium Interview Invitation' : req.type === 'instant' ? 'Direct Placement Offer' : 'Direct Opportunity Enquiry'}
                       </h3>
                       {req.status === 'pending' && <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[9px] font-bold uppercase tracking-wide">Pending Response</span>}
                    </div>
                    <p className="text-xs text-gray-400 font-medium">From {req.employer_name} {req.job_title ? `&middot; For ${req.job_title}` : ''}</p>
                    {req.type === 'instant' && (
                      <p className="text-[11px] font-semibold text-brand-primary pt-1">
                        Salary Offer: ৳{req.total_pay} for {req.hours} schedule hours
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {req.status === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'declined')}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 text-gray-400 rounded text-xs font-semibold hover:text-rose-400 hover:border-rose-500/20 transition-all"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => handleRequestAction(req.id, 'accepted')}
                        className="px-4 py-1.5 bg-brand-primary text-white rounded text-xs font-semibold hover:opacity-90 transition-all"
                      >
                        Accept Offer
                      </button>
                    </>
                  ) : (
                    <span className={cn(
                      "px-2.5 py-1 rounded text-[10px] font-bold uppercase border",
                      getStatusColor(req.status)
                    )}>
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {hiringRequests.length === 0 && (
            <div className="py-16 bg-[#111827] border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center space-y-3">
              <Mail className="w-8 h-8 text-gray-600" />
              <p className="text-xs text-gray-500 font-medium">No direct recruiter offers received yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Applications;
