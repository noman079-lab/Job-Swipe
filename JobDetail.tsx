import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { 
  MapPin, Clock, DollarSign, Calendar, 
  ChevronLeft, Share2, Bookmark, ShieldCheck, 
  Zap, Users, Briefcase, Info, MessageSquare,
  Loader2, CheckCircle2, Fingerprint
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  const [job, setJob] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [matchData, setMatchData] = useState<any>(null);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // Employer application tracker states
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [updatingAppId, setUpdatingAppId] = useState<string | null>(null);
  const [statusNoteText, setStatusNoteText] = useState<{ [appId: string]: string }>({});

  useEffect(() => {
    fetchJobDetails();
  }, [id]);

  useEffect(() => {
    if (user) {
      checkUserInteraction();
      fetchMatchScore();
    }
  }, [user, id]);

  const fetchEmployerData = async () => {
    if (!id || !user || user.role !== 'employer') return;
    setLoadingHistory(true);
    try {
      const [appRes, histRes] = await Promise.all([
        apiFetch(`/api/employer/jobs/${id}/applicants`),
        apiFetch(`/api/employer/jobs/${id}/application-history`)
      ]);
      
      if (appRes.ok) {
        const apps = await appRes.json();
        setApplicants(apps);
      }
      
      if (histRes.ok) {
        const hist = await histRes.json();
        setHistoryLogs(hist);
      }
    } catch (err) {
      console.error("Failed to load employer workflow history details", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user && job && user.role === 'employer' && job.employer_id === user.id) {
      fetchEmployerData();
    }
  }, [user, job, id]);

  const updateCandidateStatus = async (appId: string, newStatus: string, customNoteText?: string) => {
    setUpdatingAppId(appId);
    try {
      const res = await apiFetch(`/api/employer/applications/${appId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes: customNoteText || "" })
      });
      
      if (res.ok) {
        toast.success("Ledger updated successfully.");
        setStatusNoteText(prev => ({ ...prev, [appId]: "" }));
        await fetchEmployerData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update candidate status");
      }
    } catch (err) {
      console.error(err);
      toast.error("Process transition connection error");
    } finally {
      setUpdatingAppId(null);
    }
  };

  const fetchMatchScore = async () => {
    if (!id || !user) return;
    setLoadingMatch(true);
    try {
      const res = await apiFetch(`/api/ai/match-score?jobId=${id}`);
      if (res.ok) {
        const data = await res.json();
        setMatchData(data);
      }
    } catch (err) {
      console.error("Match score error:", err);
    } finally {
      setLoadingMatch(false);
    }
  };

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) throw new Error("Job not found");
      const data = await res.json();
      setJob(data);
    } catch (err) {
      toast.error("Failed to load job details");
      navigate("/marketplace");
    } finally {
      setLoading(false);
    }
  };

  const checkUserInteraction = async () => {
    if (!user) return;

    try {
      const [appliedRes, savedRes] = await Promise.all([
        apiFetch(`/api/user/applied-job-ids`),
        apiFetch(`/api/user/saved-job-ids`)
      ]);
      
      const appliedIds = await appliedRes.json();
      const savedIds = await savedRes.json();
      
      if (appliedRes.ok && Array.isArray(appliedIds)) {
        setHasApplied(appliedIds.includes(id));
      }
      
      if (savedRes.ok && Array.isArray(savedIds)) {
        setIsSaved(savedIds.includes(id));
      }
    } catch (err) {
      console.error("Interaction check error:", err);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error("Please login to apply");
      navigate("/login");
      return;
    }

    if (hasApplied) {
      toast.info("You've already applied for this job");
      return;
    }

    setIsApplying(true);
    try {
      const res = await apiFetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id })
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        toast.success(data.message || "Application sent! 🚀");
        setHasApplied(true);
      } else {
        toast.error(data.error || "Failed to submit application");
      }
    } catch (err) {
      console.error("Apply error:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      toast.error("Please login to save jobs");
      navigate("/login");
      return;
    }

    setIsSaving(true);
    try {
      const res = await apiFetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: id })
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(data.message || (data.saved ? "Job saved successfully 📂" : "Job removed from saved"));
        setIsSaved(!!data.saved);
      } else {
        toast.error(data.error || "Failed to update saved status");
      }
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to update saved status");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <p className="text-gray-500 font-black uppercase tracking-widest">Entry not found in database_</p>
        <button onClick={() => navigate("/marketplace")} className="btn-outline px-6">Return to Hub</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 px-4 pb-20 mt-8">
      {/* Header / Breadcrumb */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="group flex items-center space-x-2 text-gray-500 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-xs font-black uppercase tracking-widest">Back to Hub_</span>
        </button>
        <div className="flex items-center space-x-4">
          <button onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Intelligence link copied!");
          }} className="p-3 bento-card hover:border-brand-primary/50 transition-all">
            <Share2 className="w-5 h-5 text-gray-400" />
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "p-3 bento-card transition-all",
              isSaved ? "border-brand-primary/50 bg-brand-primary/10" : "hover:border-brand-primary/50"
            )}
            title={isSaved ? "Unsave Job" : "Save Job"}
          >
            <Bookmark className={cn("w-5 h-5", isSaved ? "text-brand-primary fill-current" : "text-gray-400")} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8 text-left">
          <div className="bento-card p-8 space-y-6">
            <div className="flex items-start justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                   <div className="px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full text-[10px] font-black uppercase tracking-widest text-brand-primary">
                     {job.type}
                   </div>
                   {job.budget?.toLowerCase().includes('urgent') && (
                     <div className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center space-x-1">
                       <Zap className="w-3 h-3 fill-current animate-pulse" />
                       <span>Urgent</span>
                     </div>
                   )}
                </div>
                <h1 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{job.title}</h1>
                <div className="flex flex-wrap gap-y-2 gap-x-6">
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    <MapPin className="w-4 h-4 text-brand-primary" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    <Clock className="w-4 h-4 text-brand-primary" />
                    <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    <span className="text-emerald-400">{job.budget}</span>
                  </div>
                </div>
              </div>
              <div className="w-20 h-20 bento-card p-0 overflow-hidden flex-shrink-0 border-white/20">
                {job.company_logo ? (
                  <img src={job.company_logo} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-brand-primary/20 flex items-center justify-center font-black italic text-2xl">
                    {job.company_name?.[0]}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            {/* AI Match Score Section */}
            {user && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center">
                    <Fingerprint className="w-4 h-4 mr-2" />
                    AI Talent Matcher Suite
                  </h3>
                  {loadingMatch && <Loader2 className="w-3 h-3 animate-spin text-brand-primary" />}
                </div>

                {!matchData && !loadingMatch && (
                   <button 
                    onClick={fetchMatchScore}
                    className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-brand-primary transition-colors"
                   >
                     Calculate AI Fit Analysis
                   </button>
                )}

                {matchData && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/[0.01] border border-white/[0.06] rounded-lg p-5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1 text-left">
                        <div className="text-3xl font-bold text-brand-primary">{matchData.score}%</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest text-gray-500">Talent Fit Compatibility</div>
                      </div>
                      <div className="max-w-[70%] text-right">
                        <p className="text-xs font-semibold text-gray-300 leading-relaxed italic">
                          "{matchData.summary}"
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2 text-left">
                        <h5 className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Core Strengths</h5>
                        <ul className="space-y-1">
                          {Array.isArray(matchData.strengths) && matchData.strengths.slice(0, 3).map((s: string, idx: number) => (
                            <li key={idx} className="text-[10px] text-gray-400 flex items-start">
                              <span className="text-emerald-500 mr-2">•</span>
                              {s}
                            </li>
                          ))}
                          {(!matchData.strengths || matchData.strengths.length === 0) && <li className="text-[10px] text-gray-500 italic">No specific strengths noted</li>}
                        </ul>
                      </div>
                      <div className="space-y-2 text-left">
                        <h5 className="text-[9px] font-black uppercase tracking-widest text-amber-500">Growth Areas</h5>
                        <ul className="space-y-1">
                          {Array.isArray(matchData.weaknesses) && matchData.weaknesses.slice(0, 3).map((w: string, idx: number) => (
                            <li key={idx} className="text-[10px] text-gray-400 flex items-start">
                              <span className="text-amber-500 mr-2">•</span>
                              {w}
                            </li>
                          ))}
                          {(!matchData.weaknesses || matchData.weaknesses.length === 0) && <li className="text-[10px] text-gray-500 italic">No major risks identified</li>}
                        </ul>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!matchData && loadingMatch && (
                  <div className="bento-card border-cyan-500/10 bg-cyan-500/5 p-12 flex flex-col items-center justify-center space-y-4">
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                      <Fingerprint className="w-6 h-6 text-cyan-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 animate-pulse">Analyzing Neural Fit...</div>
                  </div>
                )}
              </div>
            )}

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Job Description</h3>
              <p className="text-gray-300 leading-relaxed font-medium whitespace-pre-wrap">
                {job.description || "No description provided."}
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">Required Skills</h3>
              <div className="flex flex-wrap gap-2 text-left">
                {job.skills?.length > 0 ? job.skills.map((skill: string) => (
                  <span key={skill} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-gray-300 uppercase tracking-wider">
                    {skill}
                  </span>
                )) : <span className="text-gray-600 text-xs italic">Generic Skills</span>}
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bento-card p-8 border-brand-primary/20 bg-brand-primary/5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-brand-primary/30 flex items-center justify-center font-black italic text-lg">
                {job.company_name?.[0]}
              </div>
              <div className="text-left">
                <div className="flex items-center space-x-2">
                  <h4 className="font-black italic uppercase tracking-tight">{job.company_name || "Verified Employer"}</h4>
                  {job.employer_verified === 'verified' && (
                    <ShieldCheck className="w-4 h-4 text-brand-primary fill-current" />
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{job.employer_verified === 'verified' ? 'Verified Partner' : 'Standard Employer'}</p>
              </div>
            </div>
            <Link to={`/messages?user=${job.employer_id}`} className="btn-outline px-6 text-[10px] font-black uppercase tracking-widest h-12 flex items-center border-brand-primary/30 text-brand-primary">
              <MessageSquare className="w-4 h-4 mr-2" />
              Message
            </Link>
          </div>

          {/* Employer Application Hub */}
          {user?.role === 'employer' && job.employer_id === user.id && (
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 space-y-6 text-left mt-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1 text-left">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                    Application History & Logs
                  </h3>
                  <p className="text-xs text-gray-400 font-medium">Manage and track applicant recruitment pipeline stages.</p>
                </div>
                {loadingHistory && <Loader2 className="w-4 h-4 animate-spin text-brand-primary" />}
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Active Candidates ({applicants.length})
                </h4>

                {applicants.length === 0 ? (
                  <div className="text-center py-8 bg-white/[0.01] border border-white/[0.04] rounded-lg">
                    <p className="text-xs text-gray-500">No student applications received for this job posting yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {applicants.map((applicant) => {
                      const appId = applicant.application_id;
                      const noteText = statusNoteText[appId] || "";

                      return (
                        <div 
                          key={appId} 
                          className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-brand-primary/20 flex items-center justify-center font-black text-xs text-brand-primary uppercase overflow-hidden">
                                {applicant.profile_image_url ? (
                                  <img 
                                    src={applicant.profile_image_url} 
                                    alt={applicant.name} 
                                    className="w-full h-full object-cover" 
                                  />
                                ) : (
                                  applicant.name?.[0] || '?'
                                )}
                              </div>
                              <div className="text-left">
                                <h5 className="font-bold text-sm text-white">{applicant.name}</h5>
                                <p className="text-[10px] text-gray-500 font-semibold uppercase">{applicant.university || "Student Candidate"}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-2">
                              {/* Dropdown status update */}
                              <select
                                value={applicant.status}
                                disabled={updatingAppId === appId}
                                onChange={async (e) => {
                                  const nextStatus = e.target.value;
                                  await updateCandidateStatus(appId, nextStatus, noteText);
                                }}
                                className="bg-[#111827] border border-white/10 rounded-lg px-2 py-1 text-xs font-semibold text-gray-300 focus:outline-none focus:border-brand-primary"
                              >
                                <option value="pending">Pending</option>
                                <option value="shortlisted">Shortlisted</option>
                                <option value="accepted">Accepted</option>
                                <option value="rejected">Rejected</option>
                              </select>

                              <span className={cn(
                                "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider",
                                applicant.status === 'accepted' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                applicant.status === 'rejected' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                                applicant.status === 'shortlisted' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                                "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              )}>
                                {applicant.status}
                              </span>
                            </div>
                          </div>

                          {/* Message from Candidate */}
                          {applicant.message && (
                            <div className="p-3 bg-white/[0.01] border border-white/5 rounded-lg text-left">
                              <p className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mb-1">Applicant Cover Letter</p>
                              <p className="text-xs text-gray-300 italic">"{applicant.message}"</p>
                            </div>
                          )}

                          {/* Inline notes text field prior to updating status */}
                          <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                            <input
                              type="text"
                              placeholder="Add optional record notes before updating status"
                              value={noteText}
                              onChange={(e) => {
                                  setStatusNoteText(prev => ({ ...prev, [appId]: e.target.value }));
                              }}
                              className="flex-1 bg-[#111827] border border-white/5 hover:border-white/10 focus:border-brand-primary/50 transition-all rounded px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                            />
                            <button
                              onClick={() => {
                                updateCandidateStatus(appId, applicant.status, noteText || "Status noted & acknowledged.");
                              }}
                              disabled={updatingAppId === appId || !noteText.trim()}
                              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded text-xs font-semibold transition-all disabled:opacity-50"
                            >
                              Add Record Note
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* History trail section */}
              <div className="space-y-6 pt-6 border-t border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-brand-primary" />
                  Status Audit Log History
                </h4>

                {historyLogs.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 text-xs bg-white/[0.01] rounded-lg border border-white/[0.04]">
                    No status changes logged for this listing yet.
                  </div>
                ) : (
                  <div className="relative pl-6 space-y-6 border-l border-white/10 text-left">
                    {historyLogs.map((log) => {
                      const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : "Date Unknown";
                      return (
                        <div key={log.history_id} className="relative">
                          {/* Dot marker on the left border */}
                          <span className="absolute -left-[31px] top-1.5 w-2 h-2 rounded-full bg-brand-primary ring-4 ring-[#0a0a0a]" />
                          
                          <div className="space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <span className="text-[11px] font-bold text-gray-300">
                                <span className="text-brand-primary font-black uppercase">{log.candidate_name}</span> State change:
                              </span>
                              <span className="text-[9px] font-mono text-gray-500">{dateStr}</span>
                            </div>
                            
                            <div className="flex items-center space-x-2 text-xs">
                              <span className="text-gray-500 line-through pr-1">{log.from_status || 'initial'}</span>
                              <span className="text-brand-primary font-black uppercase">→</span>
                              <span className={cn(
                                "font-black uppercase tracking-wider px-2 py-0.5 rounded text-[9px]",
                                log.to_status === 'accepted' ? "text-emerald-400 bg-emerald-500/10" :
                                log.to_status === 'rejected' ? "text-rose-400 bg-rose-500/10" :
                                log.to_status === 'shortlisted' ? "text-indigo-400 bg-indigo-500/10" :
                                "text-amber-500 bg-amber-500/10"
                              )}>
                                {log.to_status}
                              </span>
                            </div>

                            {log.notes && (
                              <p className="text-xs text-gray-400 bg-white/[0.01] p-3 rounded-xl italic mt-1.5 border border-white/5">
                                "{log.notes}"
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bento-card p-8 space-y-6 sticky top-8">
            <div className="space-y-2">
               <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                 <span className="text-gray-500 italic">Compensation</span>
                 <span className="text-emerald-400 italic">{job.budget}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                 <span className="text-gray-500 italic">Work Type</span>
                 <span className="text-brand-primary italic">{job.type}</span>
               </div>
               <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest">
                 <span className="text-gray-500 italic">Difficulty</span>
                 <span className="text-amber-500 italic">Intermediate</span>
               </div>
            </div>

            <div className="h-px w-full bg-white/5" />

            <div className="space-y-4">
              {user?.role === 'employer' ? (
                <div className="w-full py-6 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex flex-col items-center justify-center space-y-2">
                   <div className="p-3 bg-brand-primary/20 rounded-full">
                     <Briefcase className="w-6 h-6 text-brand-primary" />
                   </div>
                   <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary">Managing This Listing_</span>
                </div>
              ) : hasApplied ? (
                <div className="w-full py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Application Sent</span>
                </div>
              ) : (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleApply}
                  disabled={isApplying}
                  className="w-full h-16 btn-primary rounded-[20px] text-xs font-black uppercase tracking-[0.2em] shadow-[0_0_30px_rgba(110,68,255,0.4)] flex items-center justify-center space-x-3 text-white"
                >
                  {isApplying ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : (
                    <>
                      <span>Apply Instantly</span>
                      <Zap className="w-5 h-5 text-white" />
                    </>
                  )}
                </motion.button>
              )}
              
              <Link to="/marketplace" className="w-full h-16 bento-card flex items-center justify-center space-x-3 hover:bg-white/5 transition-all text-gray-300 font-black uppercase tracking-widest text-[10px]">
                <Users className="w-4 h-4" />
                <span>View All Jobs</span>
              </Link>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-white/5 rounded-2xl border border-white/5">
              <Info className="w-5 h-5 text-brand-primary shrink-0" />
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed text-left">
                Keep your profile updated to increase chance of selection by <span className="text-brand-primary">300%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
