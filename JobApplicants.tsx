import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { 
  Users, CheckCircle2, XCircle, MessageSquare, 
  Mail, GraduationCap, Star, ArrowLeft, 
  MapPin, Loader2, Search, Filter, 
  Download, Calendar, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const JobApplicants = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [filter, setFilter] = useState("all"); // all, pending, accepted, rejected, shortlisted
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApplicant, setSelectedApplicant] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Scheduling states & handlers
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (showInterviewModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showInterviewModal]);
  const [interviewData, setInterviewData] = useState({
     title: "Tactical Interview Protocol",
     date: "",
     time: "10:00",
     type: "online",
     address: "",
     meetingLink: "",
     notes: ""
  });

  const handleRequestInterview = async () => {
    if (isSubmitting) return;
    if (!selectedApplicant) return;
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/employer/request-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
           talentId: selectedApplicant.user_id,
           jobId: jobId,
           title: interviewData.title,
           date: interviewData.date,
           time: interviewData.time,
           type: interviewData.type,
           address: interviewData.address,
           meetingLink: interviewData.meetingLink,
           notes: interviewData.notes
        })
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(`Interview proposed to ${selectedApplicant.name}!`);
        setShowInterviewModal(false);
        // Reset state
        setInterviewData({
          title: "Tactical Interview Protocol",
          date: "",
          time: "10:00",
          type: "online",
          address: "",
          meetingLink: "",
          notes: ""
        });
        if (data.conversationId) {
           navigate(`/messages/${data.conversationId}`);
        } else {
           navigate(`/messages?user=${selectedApplicant.user_id}`);
        }
      } else {
        toast.error(data.error || "Failed to schedule interview.");
      }
    } catch (err) {
      toast.error("Network communication failure.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchApplicants();
  }, [jobId]);

  const fetchApplicants = async () => {
    try {
      const res = await apiFetch(`/api/employer/jobs/${jobId}/applicants`);
      if (res.ok) {
        setApplicants(await res.json());
      }
    } catch (err) {
      toast.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: string) => {
    setActionLoading(appId);
    try {
      const res = await apiFetch(`/api/employer/applications/${appId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setApplicants(prev => prev.map(a => a.application_id === appId ? { ...a, status: newStatus } : a));
        toast.success(`Candidate status updated to ${newStatus}`);
      }
    } catch (err) {
      toast.error("Failed to update candidate status");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredApplicants = applicants.filter(a => {
    const matchesFilter = filter === "all" || a.status === filter;
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (a.university && a.university.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Scanning Talent Matrix...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
           <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <div className="text-left">
              <h2 className="text-3xl font-black italic tracking-tight uppercase leading-none">Applicant Management_</h2>
              <p className="text-[10px] font-black uppercase text-brand-primary tracking-[0.2em] mt-2">Job ID: {jobId?.split('-')[0]}...</p>
           </div>
        </div>

        <div className="flex items-center space-x-3 bg-white/5 border border-white/10 rounded-[20px] px-4 py-2">
           <Search className="w-4 h-4 text-gray-600" />
           <input 
            placeholder="Search by name, university..." 
            className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white w-48 placeholder:text-gray-700"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filters and List */}
        <div className="lg:col-span-4 space-y-6">
           <div className="flex flex-wrap gap-2">
              {["all", "pending", "shortlisted", "accepted", "rejected"].map(s => (
                <button 
                  key={s}
                  onClick={() => setFilter(s)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                    filter === s ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-gray-500 hover:border-white/30"
                  )}
                >
                  {s}
                </button>
              ))}
           </div>

           <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredApplicants.map((app) => (
                <ApplicantCard 
                  key={app.application_id} 
                  applicant={app} 
                  isActive={selectedApplicant?.application_id === app.application_id}
                  onClick={() => setSelectedApplicant(app)}
                />
              ))}
              {filteredApplicants.length === 0 && (
                <div className="py-20 border-2 border-dashed border-white/5 rounded-[40px] flex flex-col items-center justify-center space-y-4 text-center px-8">
                   <Users className="w-12 h-12 text-gray-800" />
                   <p className="text-[10px] font-black uppercase text-gray-600 tracking-widest">No candidates found in this segment_</p>
                </div>
              )}
           </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-8">
           <AnimatePresence mode="wait">
              {selectedApplicant ? (
                <motion.div 
                  key={selectedApplicant.application_id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-10 h-full flex flex-col space-y-8"
                >
                   <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
                      <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8 text-center md:text-left">
                         <div className="w-24 h-24 rounded-[32px] overflow-hidden border-2 border-brand-primary/20 shadow-2xl shadow-brand-primary/10">
                            {selectedApplicant.profile_image_url ? (
                              <img src={selectedApplicant.profile_image_url} alt={selectedApplicant.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-brand-primary to-fuchsia-600 flex items-center justify-center text-3xl font-black italic">
                                {selectedApplicant.name[0]}
                              </div>
                            )}
                         </div>
                         <div className="space-y-2">
                            <h3 className="text-4xl font-black italic uppercase tracking-tighter leading-none">{selectedApplicant.name}</h3>
                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                               <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                  <GraduationCap className="w-4 h-4" />
                                  <span>{selectedApplicant.university || "Public Identity"}</span>
                               </div>
                               <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-brand-primary tracking-widest">
                                  <Star className="w-4 h-4 fill-current" />
                                  <span>Trust Score: {selectedApplicant.trust_score}</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-col space-y-3 w-full md:w-auto">
                         <button 
                            onClick={() => setShowInterviewModal(true)} 
                            className="w-full md:w-48 py-3 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-violet-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center space-x-2"
                         >
                            <Calendar className="w-4 h-4 animate-pulse" />
                            <span>Request Interview</span>
                         </button>
                         <button onClick={() => handleStatusChange(selectedApplicant.application_id, 'shortlisted')} className="w-full md:w-48 py-3 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Shortlist</button>
                         <div className="flex space-x-3">
                            <button onClick={() => handleStatusChange(selectedApplicant.application_id, 'accepted')} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all">Accept</button>
                            <button onClick={() => handleStatusChange(selectedApplicant.application_id, 'rejected')} className="flex-1 py-3 bg-white/5 border border-white/10 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all">Reject</button>
                          </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                      <div className="space-y-6 text-left">
                         <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Personal Statement_</h4>
                            <p className="text-gray-400 text-sm leading-relaxed italic font-medium">"{selectedApplicant.message || "No custom message provided."}"</p>
                         </div>
                         <div className="space-y-3">
                            <h4 className="text-[10px] font-black uppercase text-gray-600 tracking-widest">Skills Matrix_</h4>
                            <div className="flex flex-wrap gap-2">
                               {selectedApplicant.skills?.map((s: string, i: number) => (
                                 <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-gray-400">{s}</span>
                               ))}
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6 flex flex-col justify-between text-left">
                         <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                               <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  <Mail className="w-4 h-4" />
                                  <span>Verification</span>
                               </div>
                               <span className="text-[10px] font-black uppercase text-emerald-500 italic">Confirmed</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                               <div className="flex items-center space-x-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                  <Calendar className="w-4 h-4" />
                                  <span>Applied On</span>
                               </div>
                               <span className="text-[10px] font-black uppercase text-gray-500 italic">{new Date(selectedApplicant.created_at).toLocaleDateString()}</span>
                            </div>
                         </div>

                         <div className="flex space-x-3">
                            <button className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all">
                               <MessageSquare className="w-4 h-4" />
                               <span>Signal Message</span>
                            </button>
                            <button className="flex-1 py-4 bg-brand-primary/10 border border-brand-primary/20 rounded-2xl flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-widest text-brand-primary hover:bg-brand-primary hover:text-white transition-all">
                               <Download className="w-4 h-4" />
                               <span>Intel Sync</span>
                            </button>
                         </div>
                      </div>
                   </div>

                   <div className="mt-auto py-6 bg-brand-primary/5 rounded-3xl border border-brand-primary/10 px-8 flex items-center justify-between">
                       <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-brand-primary/20 rounded-full flex items-center justify-center animate-pulse">
                             <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                          </div>
                          <div className="text-left">
                             <p className="text-[10px] font-black uppercase text-brand-primary tracking-widest italic">Match Score: 94%</p>
                             <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest">AI Logic confirms high structural fit.</p>
                          </div>
                       </div>
                       <ChevronRight className="w-6 h-6 text-brand-primary opacity-30" />
                   </div>
                </motion.div>
              ) : (
                <div className="h-full bg-white/[0.02] border border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center space-y-6 text-center px-10">
                   <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center opacity-20">
                      <Users className="w-12 h-12" />
                   </div>
                   <div className="space-y-2">
                    <p className="text-xl font-black italic uppercase tracking-tighter text-gray-600">Neutral Selection State</p>
                    <p className="text-[10px] font-black uppercase text-gray-700 tracking-widest max-w-xs">Select a candidate from the left panel to initialize intelligence review and management actions.</p>
                   </div>
                </div>
              )}
            </AnimatePresence>

       {/* Interview Request Modal */}
       <AnimatePresence>
          {showInterviewModal && selectedApplicant && (
             <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   onClick={() => { if (!isSubmitting) setShowInterviewModal(false); }}
                   className="absolute inset-0 bg-black/85 backdrop-blur-sm"
                />
                
                <motion.div 
                   initial={{ opacity: 0, scale: 0.9, y: 30 }}
                   animate={{ opacity: 1, scale: 1, y: 0 }}
                   exit={{ opacity: 0, scale: 0.9, y: 30 }}
                   className="relative bg-[#0A0A0A] border border-white/10 rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
                >
                   {/* Header */}
                   <div className="p-8 pb-4 border-b border-white/[0.05] text-center space-y-3 shrink-0 bg-white/[0.01]">
                      <div className="w-14 h-14 bg-violet-600/10 rounded-2xl flex items-center justify-center mx-auto">
                         <Calendar className="w-7 h-7 text-violet-400" />
                      </div>
                      <div className="space-y-1">
                         <h2 className="text-2xl font-black italic uppercase tracking-tight text-white">Interview Protocol_</h2>
                         <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest leading-none">Initialize engagement timeline for {selectedApplicant.name}</p>
                      </div>
                   </div>

                   {/* Content */}
                   <div className="p-8 pt-6 pb-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar text-left font-sans">
                      <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Protocol Title_</label>
                          <input 
                              className="w-full bg-white/5 border border-white/10 text-white rounded-2xl px-5 py-4 text-sm font-black uppercase outline-none focus:border-violet-500 transition-all placeholder:text-gray-600 whitespace-nowrap"
                              disabled={isSubmitting}
                              value={interviewData.title}
                              onChange={(e) => setInterviewData({...interviewData, title: e.target.value})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2 text-left">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Date</label>
                              <input 
                                  type="date"
                                  disabled={isSubmitting}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
                                  value={interviewData.date || ""}
                                  onChange={(e) => setInterviewData({...interviewData, date: e.target.value})}
                              />
                          </div>
                         <div className="space-y-2 text-left">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Time</label>
                              <input 
                                  type="time"
                                  disabled={isSubmitting}
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-violet-500"
                                  value={interviewData.time || "10:00"}
                                  onChange={(e) => setInterviewData({...interviewData, time: e.target.value})}
                              />
                          </div>
                      </div>

                      <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Protocol Location Type</label>
                          <select 
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-black uppercase text-white outline-none focus:border-violet-500 appearance-none text-left font-sans"
                              value={interviewData.type}
                              disabled={isSubmitting}
                              onChange={(e) => setInterviewData({...interviewData, type: e.target.value})}
                          >
                              <option value="online" className="bg-[#0A0A0A]">Online Transmission</option>
                              <option value="physical" className="bg-[#0A0A0A]">Physical Presence</option>
                              <option value="phone" className="bg-[#0A0A0A]">Voice Link (Phone)</option>
                          </select>
                      </div>

                      {interviewData.type === 'online' ? (
                          <div className="space-y-2 animate-in fade-in duration-150 text-left">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Meeting Link_</label>
                              <input 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-violet-500"
                                  placeholder="Meet/Zoom Link"
                                  disabled={isSubmitting}
                                  value={interviewData.meetingLink}
                                  onChange={(e) => setInterviewData({...interviewData, meetingLink: e.target.value})}
                              />
                          </div>
                      ) : (
                          <div className="space-y-2 animate-in fade-in duration-150 text-left">
                              <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Facility Address_</label>
                              <input 
                                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-violet-500"
                                  placeholder="Office Address"
                                  disabled={isSubmitting}
                                  value={interviewData.address}
                                  onChange={(e) => setInterviewData({...interviewData, address: e.target.value})}
                              />
                          </div>
                      )}

                      <div className="space-y-2 text-left">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Tactical Protocol Notes_</label>
                          <textarea 
                              className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-medium text-white outline-none focus:border-violet-500 min-h-[90px]"
                              placeholder="Add preparation codes/notes for candidate here..."
                              disabled={isSubmitting}
                              value={interviewData.notes}
                              onChange={(e) => setInterviewData({...interviewData, notes: e.target.value})}
                          />
                      </div>
                   </div>

                   {/* Footer */}
                   <div className="p-8 pt-4 border-t border-white/[0.05] bg-white/[0.01] flex flex-col gap-3 shrink-0">
                      <button 
                       onClick={handleRequestInterview}
                       disabled={isSubmitting || !interviewData.date || !interviewData.title}
                       className="w-full py-5 bg-violet-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-xl shadow-violet-600/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-55 flex items-center justify-center gap-2 text-center"
                      >
                        {isSubmitting ? (
                           <>
                             <Loader2 className="w-4 h-4 animate-spin" />
                             <span>Transmitting Request...</span>
                           </>
                        ) : (
                           'Submit Protocol Request'
                        )}
                      </button>
                      <button 
                        onClick={() => { if (!isSubmitting) setShowInterviewModal(false); }} 
                        disabled={isSubmitting}
                        className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors disabled:opacity-40"
                      >
                        Discard Protocol_
                      </button>
                   </div>
                </motion.div>
             </div>
          )}
       </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const ApplicantCard = ({ applicant, isActive, onClick }: { applicant: any, isActive: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center p-5 rounded-[32px] border transition-all text-left group relative overflow-hidden",
      isActive ? "bg-white/10 border-white/20 shadow-xl" : "bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]"
    )}
  >
     {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />}
     
     <div className="w-14 h-14 rounded-2xl overflow-hidden mr-4 flex-shrink-0 border border-white/10">
        {applicant.profile_image_url ? (
          <img src={applicant.profile_image_url} alt={applicant.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-900 flex items-center justify-center font-black italic uppercase">
            {applicant.name[0]}
          </div>
        )}
     </div>

     <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between mb-1">
           <h4 className="text-sm font-black italic uppercase tracking-tight truncate pr-2">{applicant.name}</h4>
           <span className={cn(
             "text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full",
             applicant.status === 'accepted' ? "bg-emerald-500/20 text-emerald-500" :
             applicant.status === 'rejected' ? "bg-rose-500/20 text-rose-500" :
             applicant.status === 'shortlisted' ? "bg-indigo-500/20 text-indigo-500" :
             "bg-white/10 text-gray-400 mt-1"
           )}>
             {applicant.status}
           </span>
        </div>
        <p className="text-[9px] font-bold uppercase text-gray-500 tracking-widest truncate">{applicant.university || "Public Candidate"}</p>
        <div className="mt-2 flex items-center space-x-2">
           <div className="flex -space-x-1">
              {[1,2,3].map(i => (
                <div key={i} className="w-3 h-3 rounded-full bg-brand-primary/20 border border-[#0A0A0A]" />
              ))}
           </div>
           <span className="text-[8px] font-black italic text-brand-primary">Match Potential: High</span>
        </div>
     </div>
  </button>
);

export default JobApplicants;
