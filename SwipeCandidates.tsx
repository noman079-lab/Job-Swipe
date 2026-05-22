import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { 
  X, GraduationCap, Star, Loader2, Zap, Clock, DollarSign, 
  MessageCircle, ShieldCheck, Calendar, Bookmark 
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";

interface Candidate {
  id: string;
  name: string;
  university: string;
  department: string;
  xp: number;
  skills: string[];
  profile_image_url: string;
  trust_score: number;
  role: string;
}

const SwipeCandidates = () => {
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showHireModal, setShowHireModal] = useState(false);
  const [hireType, setHireType] = useState<"elite" | "interview" | "instant">("instant");
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const modalScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showHireModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [showHireModal]);

  const [hiringData, setHiringData] = useState({
     jobId: "",
     hours: "4",
     pay: "1000",
     customMessage: "",
     interviewTitle: "Initial Interview",
     interviewDate: "",
     interviewTime: "10:00",
     interviewType: "online",
     address: "",
     meetingLink: "",
     notes: ""
  });

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-30, 30]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const heartOpacity = useTransform(x, [50, 150], [0, 1]);
  const xOpacity = useTransform(x, [-150, -50], [1, 0]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/employer/talents");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setCandidates(data);
      
      const jobsRes = await apiFetch("/api/employer/dashboard");
      if (jobsRes.ok) {
        const jData = await jobsRes.json();
        setMyJobs(jData.activeJobs || []);
        if (jData.activeJobs?.length > 0) {
            setHiringData(prev => ({ ...prev, jobId: jData.activeJobs[0].id }));
        }
      }
    } catch (err) {
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleAction = async (type: "elite" | "interview" | "instant") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    const current = candidates[currentIndex];
    const endpoint = type === 'elite' ? '/api/employer/hire-elite' : 
                     type === 'interview' ? '/api/employer/request-interview' : 
                     '/api/employer/instant-hire';
    
    try {
      const body: any = {
           talentId: current.id,
           jobId: hiringData.jobId,
      };

      if (type === 'instant') {
          body.hours = hiringData.hours;
          body.totalPay = hiringData.pay;
      } else if (type === 'elite') {
          body.customMessage = hiringData.customMessage;
          body.salary = hiringData.pay;
          body.isUrgent = true;
          body.includesInterview = true;
      } else if (type === 'interview') {
          body.title = hiringData.interviewTitle;
          body.date = hiringData.interviewDate;
          body.time = hiringData.interviewTime;
          body.type = hiringData.interviewType;
          body.address = hiringData.address;
          body.meetingLink = hiringData.meetingLink;
          body.notes = hiringData.notes;
      }

      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        const msg = type === 'elite' ? `Premium Offer sent to ${current.name}!` : 
                    type === 'interview' ? `Interview request sent to ${current.name}!` :
                    `Instant Hire sent for ${current.name}! ⚡`;
        toast.success(msg);
        setShowHireModal(false);
        
        // Soft reset
        setHiringData(prev => ({
          ...prev,
          interviewDate: "",
          address: "",
          meetingLink: "",
          notes: ""
        }));

        // Redirection to chat messaging context
        if (data.conversationId) {
            navigate(`/messages/${data.conversationId}`);
        } else {
            navigate(`/messages?user=${current.id}`);
        }
      } else {
          toast.error(data.error || "Action failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwipe = async (direction: "left" | "right") => {
    const current = candidates[currentIndex];
    if (direction === "right") {
      try {
        const res = await apiFetch("/api/employer/talents/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ talentId: current.id })
        });
        const data = await res.json();
        if (data.saved) {
            toast.success(`Candidate Bookmarked! 📑`);
            setSavedIds(prev => new Set(prev).add(current.id));
        } else {
            toast.info(`Candidate Removed from bookmarks`);
            setSavedIds(prev => {
                const n = new Set(prev);
                n.delete(current.id);
                return n;
            });
        }
      } catch (err) {}
    } else {
        nextCard();
    }
  };

  const nextCard = () => {
    if (currentIndex < candidates.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCandidates([]);
    }
    x.set(0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (candidates.length === 0 || currentIndex >= candidates.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center animate-in fade-in duration-300">
        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-gray-500 italic text-4xl">?</div>
        <h2 className="text-2xl font-bold">No candidates found</h2>
        <p className="text-gray-400">Expand your search or check back later.</p>
        <button onClick={fetchCandidates} className="btn-outline">Refresh Candidate Feed</button>
      </div>
    );
  }

  const current = candidates[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[82vh] relative pt-10 pb-16">
      <div className="w-full max-w-sm relative">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={current.id}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) handleSwipe("right");
              else if (info.offset.x < -100) handleSwipe("left");
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <div className="bg-card-bg border border-white/[0.06] rounded-xl overflow-hidden shadow-xl h-[540px] flex flex-col">
              <div className="h-48 bg-gradient-to-br from-brand-primary/10 to-brand-primary/5 relative flex items-center justify-center pt-8">
                <div className="w-28 h-28 rounded-full border border-white/[0.08] p-1 bg-white/5 relative overflow-hidden">
                  {current.profile_image_url ? (
                    <img src={current.profile_image_url} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center text-3xl font-semibold uppercase text-white">
                      {current.name[0]}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -right-1 bg-brand-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded border border-brand-primary">
                    {current.trust_score}% Select
                  </div>
                </div>
                
                <motion.div 
                  style={{ opacity: heartOpacity }}
                  className="absolute top-6 right-6 border border-emerald-500 text-emerald-500 rounded px-2.5 py-0.5 font-bold text-xs transform rotate-12 bg-emerald-500/10"
                >
                  SAVE
                </motion.div>
                
                <motion.div 
                  style={{ opacity: xOpacity }}
                  className="absolute top-6 left-6 border border-red-500 text-red-500 rounded px-2.5 py-0.5 font-bold text-xs transform -rotate-12 bg-red-500/10"
                >
                  SKIP
                </motion.div>
              </div>

              <div className="p-5 flex-1 flex flex-col space-y-4 bg-white/[0.01]">
                <div className="text-center">
                  <h3 className="text-lg font-bold tracking-tight text-white">{current.name}</h3>
                  <p className="text-brand-primary text-xs font-semibold mt-1">
                    {current.role || "Specialist"} • {current.xp} Years XP
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={<GraduationCap className="w-3.5 h-3.5 text-brand-primary" />} label="University" value={current.university || "N/A"} />
                  <DetailItem icon={<Star className="w-3.5 h-3.5 text-brand-primary" />} label="Department" value={current.department || "N/A"} />
                </div>
                
                <div className="pt-1 text-left">
                   <p className="text-[10px] font-bold uppercase text-gray-500 tracking-wider mb-2">Qualifications</p>
                   <div className="flex flex-wrap gap-1.5">
                    {current.skills && current.skills.length > 0 ? current.skills.map(skill => (
                      <span key={skill} className="text-xs px-2 py-0.5 bg-white/5 border border-white/5 rounded text-gray-300">
                        {skill}
                      </span>
                    )) : (
                      <span className="text-xs italic text-gray-500">No tags listed</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Main Swiper action panel centered and responsive */}
      <div className="flex items-center space-x-4 mt-[580px] z-10 max-w-sm w-full justify-center">
        <button onClick={() => handleSwipe("left")} title="Skip Candidate" className="w-12 h-12 rounded-full border border-red-500/30 text-red-500 flex items-center justify-center hover:bg-red-500/10 active:scale-95 transition-all">
          <X className="w-5 h-5" />
        </button>
        
        <button onClick={() => { setHireType("interview"); setShowHireModal(true); }} title="Schedule Interview" className="w-12 h-12 rounded-full border border-violet-500/30 text-violet-400 flex items-center justify-center hover:bg-violet-500/10 active:scale-95 transition-all">
          <Calendar className="w-5 h-5" />
        </button>

        <button onClick={() => { setHireType("instant"); setShowHireModal(true); }} title="Hire Candidate" className="w-16 h-16 rounded-full bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:bg-brand-secondary active:scale-95 transition-all">
          <Zap className="w-7 h-7 fill-current" />
        </button>
        
        <button onClick={() => navigate(`/messages?user=${current.id}`)} title="Message Candidate" className="w-12 h-12 rounded-full border border-blue-500/30 text-blue-500 flex items-center justify-center hover:bg-blue-500/10 active:scale-95 transition-all">
          <MessageCircle className="w-5 h-5" />
        </button>

        <button onClick={() => handleSwipe("right")} title="Bookmark Candidate" className="w-12 h-12 rounded-full border border-amber-500/30 text-amber-500 flex items-center justify-center hover:bg-amber-500/10 active:scale-95 transition-all">
          <Bookmark className={`w-5 h-5 ${savedIds.has(current.id) ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Hire Modal - Responsive structural grid with Scroll Fix & Sticky Actions */}
      <AnimatePresence>
        {showHireModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => { if (!isSubmitting) setShowHireModal(false); }}
               className="absolute inset-0 bg-black/85 backdrop-blur-sm"
             />
             
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 30 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 30 }}
               className="relative bg-card-bg border border-card-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
             >
                {/* Header Module */}
                <div className="p-8 pb-4 border-b border-white/[0.05] text-center space-y-4 shrink-0 bg-white/[0.01]">
                   <div className="w-14 h-14 bg-brand-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                      {hireType === 'instant' ? <Zap className="w-7 h-7 text-brand-primary fill-current" /> : hireType === 'elite' ? <ShieldCheck className="w-7 h-7 text-brand-primary" /> : <Calendar className="w-7 h-7 text-brand-primary" />}
                   </div>
                   <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight text-white">{hireType === 'instant' ? 'Instant Hire' : hireType === 'elite' ? 'Premium Offer' : 'Interview Request'}</h2>
                      <p className="text-xs text-gray-400 mt-1">Send an offer or interview request to {current.name}</p>
                   </div>
                   
                   <div className="flex bg-[#121214] p-1 rounded-xl border border-[#27272a] overflow-x-auto no-scrollbar whitespace-nowrap">
                      {(['instant', 'elite', 'interview'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setHireType(t)}
                          disabled={isSubmitting}
                          className={cn(
                            "flex-1 px-2 py-2 text-xs font-semibold rounded-lg transition-all disabled:opacity-55 outline-none flex items-center justify-center gap-1",
                            hireType === t ? "bg-brand-primary text-white shadow-md" : "text-gray-400 hover:text-white"
                          )}
                        >
                          {t === 'instant' ? '⚡ Instant' : t === 'elite' ? '💼 Premium' : '📅 Interview'}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Scrollable Contents Container */}
                <div 
                  ref={modalScrollRef}
                  className="p-8 pt-6 pb-6 flex-1 overflow-y-auto space-y-6 custom-scrollbar text-left relative"
                >
                   <div className="space-y-2 text-left">
                      <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Select Active Job Role</label>
                      <select 
                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-brand-primary transition-all cursor-pointer"
                        value={hiringData.jobId}
                        disabled={isSubmitting}
                        onChange={(e) => setHiringData({...hiringData, jobId: e.target.value})}
                      >
                         <option value="" className="bg-[#0A0A0A]">Select Job (Optional)</option>
                         {myJobs.map(j => <option key={j.id} value={j.id} className="bg-[#0A0A0A]">{j.title}</option>)}
                      </select>
                   </div>

                   {hireType === 'instant' && (
                      <div className="grid grid-cols-2 gap-6 text-left animate-in fade-in duration-200">
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pt-1">
                              <Clock className="w-3.5 h-3.5" /> Duration (Hours)
                            </label>
                            <input 
                             type="number"
                             placeholder="Hours"
                             disabled={isSubmitting}
                             className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                             value={hiringData.hours}
                             onChange={(e) => setHiringData({...hiringData, hours: e.target.value})}
                            />
                         </div>
                         <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5 pt-1">
                              <DollarSign className="w-3.5 h-3.5" /> Total Pay (BDT)
                            </label>
                            <input 
                             type="number"
                             placeholder="৳ amount"
                             disabled={isSubmitting}
                             className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                             value={hiringData.pay}
                             onChange={(e) => setHiringData({...hiringData, pay: e.target.value})}
                            />
                         </div>
                      </div>
                   )}

                   {hireType === 'elite' && (
                        <div className="space-y-6 text-left animate-in fade-in duration-200">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                                    <MessageCircle className="w-3.5 h-3.5" /> Core Proposal Message
                                </label>
                                <textarea 
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary min-h-[100px]"
                                    placeholder="Explain why they are chosen for this role..."
                                    disabled={isSubmitting}
                                    value={hiringData.customMessage}
                                    onChange={(e) => setHiringData({...hiringData, customMessage: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400">Proposed Monthly Budget (BDT)</label>
                                <input 
                                    type="number"
                                    disabled={isSubmitting}
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                                    value={hiringData.pay}
                                    onChange={(e) => setHiringData({...hiringData, pay: e.target.value})}
                                />
                            </div>
                        </div>
                   )}

                   {hireType === 'interview' && (
                        <div className="space-y-6 text-left animate-in fade-in duration-200">
                           <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400">Interview Title</label>
                                <input 
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                                    disabled={isSubmitting}
                                    value={hiringData.interviewTitle}
                                    onChange={(e) => setHiringData({...hiringData, interviewTitle: e.target.value})}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                               <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400">Date</label>
                                    <input 
                                        type="date"
                                        disabled={isSubmitting}
                                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary inverted-date-icon"
                                        value={hiringData.interviewDate}
                                        onChange={(e) => setHiringData({...hiringData, interviewDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400">Time</label>
                                    <input 
                                        type="time"
                                        disabled={isSubmitting}
                                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary inverted-time-icon"
                                        value={hiringData.interviewTime}
                                        onChange={(e) => setHiringData({...hiringData, interviewTime: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400">Interview Format (Location)</label>
                                <select 
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary cursor-pointer"
                                    value={hiringData.interviewType}
                                    disabled={isSubmitting}
                                    onChange={(e) => setHiringData({...hiringData, interviewType: e.target.value})}
                                >
                                    <option value="online" className="bg-[#0A0A0A]">Online video call</option>
                                    <option value="physical" className="bg-[#0A0A0A]">Physical interview</option>
                                    <option value="phone" className="bg-[#0A0A0A]">Phone interview</option>
                                </select>
                            </div>
                            {hiringData.interviewType === 'online' ? (
                                <div className="space-y-2 animate-in fade-in duration-150">
                                    <label className="text-xs font-semibold text-gray-400">Meeting Link</label>
                                    <input 
                                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                                        placeholder="Meet/Zoom Link"
                                        disabled={isSubmitting}
                                        value={hiringData.meetingLink}
                                        onChange={(e) => setHiringData({...hiringData, meetingLink: e.target.value})}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2 animate-in fade-in duration-150">
                                    <label className="text-xs font-semibold text-gray-400">Office Address</label>
                                    <input 
                                        className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary"
                                        placeholder="Office Address"
                                        disabled={isSubmitting}
                                        value={hiringData.address}
                                        onChange={(e) => setHiringData({...hiringData, address: e.target.value})}
                                    />
                                </div>
                            )}
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-400">Interview Guidelines & Instructions</label>
                                <textarea 
                                    className="w-full bg-[#121214] border border-[#27272a] rounded-xl px-4 py-2.5 text-sm font-normal text-white outline-none focus:border-brand-primary min-h-[90px]"
                                    placeholder="Add preparation guidelines or notes for candidate here..."
                                    disabled={isSubmitting}
                                    value={hiringData.notes}
                                    onChange={(e) => setHiringData({...hiringData, notes: e.target.value})}
                                />
                            </div>
                        </div>
                   )}
                </div>

                {/* Sticky Footer Module for Action Buttons */}
                <div className="p-8 pt-4 border-t border-white/[0.05] bg-white/[0.01] flex flex-col gap-3 shrink-0">
                   <button 
                    onClick={() => handleAction(hireType)}
                    disabled={isSubmitting}
                    className="w-full py-3 bg-brand-primary text-white rounded-xl text-xs font-semibold hover:bg-brand-secondary transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-center shadow-lg shadow-brand-primary/10"
                   >
                     {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Sending Request...</span>
                        </>
                     ) : (
                        hireType === 'instant' ? 'Confirm Hire' : hireType === 'elite' ? 'Send Premium Offer' : 'Send Interview Request'
                     )}
                   </button>
                   <button 
                     onClick={() => { if (!isSubmitting) setShowHireModal(false); }} 
                     disabled={isSubmitting}
                     className="w-full py-2 text-xs font-semibold text-gray-500 hover:text-white transition-colors disabled:opacity-40"
                   >
                     Cancel
                   </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-white/5 p-3 rounded-2xl border border-white/5">
    <div className="flex items-center space-x-2 text-gray-500 mb-1">
      {icon}
      <span className="text-[10px] uppercase font-bold">{label}</span>
    </div>
    <p className="text-xs font-bold truncate leading-none text-white">{value}</p>
  </div>
);

export default SwipeCandidates;
