import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, Search, Filter, ShieldCheck, 
  Users, Briefcase, ChevronRight, Loader2
} from "lucide-react";
import { cn } from "../utils/cn";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import { JobCard } from "../components/ui/JobCard";
import { CandidateCard } from "../components/ui/CandidateCard";
import { jobService } from "../services/jobService";
import { useUserInteractions } from "../hooks/useUserInteractions";

const Marketplace = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, apiFetch } = useAuth();
  const { appliedJobIds, savedJobIds, refreshInteractions } = useUserInteractions();
  
  const [view, setView] = useState<"jobs" | "workers">("jobs");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [isUrgentOnly, setIsUrgentOnly] = useState(false);
  const [jobs, setJobs] = useState<any[]>([]);
  const [talents, setTalents] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"recent" | "skill-fit" | "rate-high">("recent");

  const [selectedTalent, setSelectedTalent] = useState<any>(null);
  const [myJobs, setMyJobs] = useState<any[]>([]);
  const [hiringData, setHiringData] = useState({ jobId: "" });

  useEffect(() => {
    if (user?.role === 'employer') {
      apiFetch("/api/employer/dashboard")
        .then((res: any) => {
          if (res.ok) return res.json();
          throw new Error("Failed");
        })
        .then((data: any) => {
          setMyJobs(data.activeJobs || []);
        })
        .catch(() => {});
    }
  }, [user]);

  const handleHireClick = async (talent: any) => {
    if (!user) return navigate("/login");
    if (user.role !== 'employer') return toast.error("Only employers can initialize recruitment");
    
    setSelectedTalent(talent);
    try {
      const res = await apiFetch("/api/employer/dashboard");
      if (res.ok) {
        const data = await res.json();
        setMyJobs(data.activeJobs || []);
        if (data.activeJobs?.length > 0) {
           setHiringData({ jobId: data.activeJobs[0].id });
        }
      }
    } catch (err) {}
  };

  const handleAction = async (type: 'hire' | 'interview') => {
    if (!selectedTalent || !hiringData.jobId) return;
    
    const endpoint = type === 'hire' ? "/api/employer/instant-hire" : "/api/employer/request-interview";
    const body = type === 'hire' ? {
       talentId: selectedTalent.id, 
       jobId: hiringData.jobId,
       hours: "4", totalPay: "1000" // Simplified
    } : {
       talentId: selectedTalent.id,
       jobId: hiringData.jobId
    };

    setActionLoading(type);
    try {
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        toast.success(type === 'hire' ? "Hired instantly!" : "Interview requested!");
        setSelectedTalent(null);
      } else {
        const error = await res.json();
        toast.error(error.error || "Action failed");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const category = params.get("category");
    const type = params.get("type");
    const tab = params.get("tab");
    
    if (category) setSelectedCategory(category);
    if (type) setSelectedType(type);
    
    // Strict Role Enforcement
    if (user?.role === 'worker') {
        setView("jobs");
    } else if (user?.role === 'employer') {
        setView("workers");
    } else {
        if (tab === "workers" || tab === "candidates") setView("workers");
        else setView("jobs");
    }
  }, [location.search, user?.role]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobService.getJobs({
        search: searchQuery,
        category: selectedCategory || undefined,
        type: selectedType || undefined,
        isUrgent: isUrgentOnly
      });
      setJobs(data);
    } catch (err) {
      toast.error("Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTalents = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/employer/talents");
      if (res.ok) {
        const data = await res.json();
        setTalents(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (view === "jobs") fetchJobs();
    else fetchTalents();
  }, [view, searchQuery, selectedCategory, selectedType, isUrgentOnly]);

  const handleApply = async (jobId: string, e?: React.MouseEvent) => {
    if (!user) return navigate("/login");
    setActionLoading(jobId);
    try {
      await jobService.applyForJob(apiFetch, jobId);
      toast.success("Application sent! 🚀");
      refreshInteractions();
    } catch (err: any) {
      toast.warning(err.message || "Failed to apply");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async (jobId: string) => {
    if (!user) return navigate("/login");
    setActionLoading(`save-${jobId}`);
    try {
      await jobService.saveJob(apiFetch, jobId);
      refreshInteractions();
    } catch (err) {
      toast.error("Failed to save");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLike = async (jobId: string) => {
    if (!user) return navigate("/login");
    try {
      await jobService.likeJob(apiFetch, jobId);
      toast.success("Favorited! ❤️");
    } catch (err) {
      toast.error("Failed");
    }
  };

  // Enrich jobs with match scores
  const enrichedJobs = React.useMemo(() => {
    if (!jobs) return [];
    const candidateSkills = user?.skills || [];
    
    return jobs.map(job => {
      const jobSkills = job.skills || [];
      const matchingSkills = jobSkills.filter((s1: string) => 
        candidateSkills.some((s2: string) => s2.toLowerCase() === s1.toLowerCase())
      );
      const matchPercentage = jobSkills.length > 0 
        ? Math.round((matchingSkills.length / jobSkills.length) * 100) 
        : 0;

      return {
        ...job,
        matchPercentage,
        matchingSkills
      };
    });
  }, [jobs, user?.skills]);

  // Sort them dynamically
  const sortedJobs = React.useMemo(() => {
    const list = [...enrichedJobs];
    if (sortBy === "skill-fit") {
      return list.sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return (b.matchingSkills?.length || 0) - (a.matchingSkills?.length || 0);
      });
    } else if (sortBy === "rate-high") {
      return list.sort((a, b) => {
        const valA = parseInt(a.budget || a.min_salary || "0", 10);
        const valB = parseInt(b.budget || b.min_salary || "0", 10);
        return valB - valA;
      });
    }
    return list;
  }, [enrichedJobs, sortBy]);

  // Enrich talents with match scores
  const enrichedTalents = React.useMemo(() => {
    if (!talents) return [];
    const employerRequiredSkills = Array.from(new Set(
      myJobs.flatMap((j: any) => j.skills || []).map((s: string) => s.toLowerCase())
    ));

    return talents.map(t => {
      const talentSkills = t.skills || [];
      const matchingSkills = talentSkills.filter((s: string) => 
        employerRequiredSkills.includes(s.toLowerCase())
      );
      const matchPercentage = employerRequiredSkills.length > 0
        ? Math.round((matchingSkills.length / employerRequiredSkills.length) * 100)
        : 0;

      return {
        ...t,
        matchPercentage,
        matchingSkills
      };
    });
  }, [talents, myJobs]);

  // Sort talents dynamically
  const sortedTalents = React.useMemo(() => {
    const list = [...enrichedTalents];
    if (sortBy === "skill-fit") {
      return list.sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return (b.matchingSkills?.length || 0) - (a.matchingSkills?.length || 0);
      });
    }
    return list;
  }, [enrichedTalents, sortBy]);

  return (
    <div className="space-y-6 pb-24 px-4 max-w-7xl mx-auto mt-6">
      
      {/* SaaS Styled Header */}
      <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 md:p-8 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10 text-left">
          <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
            <span>Talent Directory</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Marketplace</h1>
          <p className="text-gray-400 text-xs max-w-md font-normal leading-relaxed">
            Find vetted academic tutors, software engineers, and specialized student professionals quickly.
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end gap-4 relative z-10 shrink-0">
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search..." 
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-10 pr-4 text-xs font-medium outline-none focus:border-brand-primary transition-all placeholder:text-gray-500 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {!user && (
            <div className="flex bg-white/5 p-1 rounded-lg border border-white/[0.06] overflow-x-auto no-scrollbar whitespace-nowrap w-full">
              <button 
                onClick={() => setView("jobs")}
                className={cn(
                  "flex-1 px-4 py-1.5 rounded text-xs font-semibold transition-all text-center",
                  view === "jobs" ? "bg-brand-primary text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Listings
              </button>
              <button 
                onClick={() => setView("workers")}
                className={cn(
                  "flex-1 px-4 py-1.5 rounded text-xs font-semibold transition-all text-center",
                  view === "workers" ? "bg-brand-primary text-white" : "text-gray-400 hover:text-white"
                )}
              >
                Candidates
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 space-y-5 sticky top-24">
             <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                   <Filter className="w-3.5 h-3.5 text-gray-400" />
                   <span>Filters</span>
                </h3>
             </div>
             
             <div className="space-y-5 text-left">
                <FilterSection label="Categories">
                  {["Tuition", "Tech", "Design", "Events"].map(cat => (
                    <FilterChip key={cat} label={cat} active={selectedCategory === cat} onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)} />
                  ))}
                </FilterSection>

                <FilterSection label="Type">
                  {["Part-time", "Internship", "Contract"].map(type => (
                    <FilterChip key={type} label={type} active={selectedType === type} onClick={() => setSelectedType(selectedType === type ? null : type)} />
                  ))}
                </FilterSection>

                <div className="pt-4 border-t border-white/[0.04]">
                  <button 
                    onClick={() => setIsUrgentOnly(!isUrgentOnly)}
                    className={cn(
                      "w-full py-2 rounded-lg text-xs font-semibold border transition-all flex items-center justify-center space-x-1.5",
                      isUrgentOnly ? "bg-rose-500/20 text-rose-400 border-rose-500/30" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Urgent Only</span>
                  </button>
                </div>
             </div>
          </div>
        </aside>

        {/* Content Feed */}
        <main className="lg:col-span-9 space-y-6">
          
          {/* Security Banner */}
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="flex items-center space-x-3 text-brand-primary text-left">
               <ShieldCheck className="w-5 h-5 flex-shrink-0 text-brand-primary" />
               <div className="space-y-0.5">
                  <span className="text-xs font-bold text-white block">Escrow Protected Hiring</span>
                  <p className="text-xs text-gray-400">All student projects and hourly roles utilize verified escrow payment protection pools.</p>
               </div>
             </div>
             <button onClick={() => navigate("/pricing")} className="text-xs font-semibold border border-brand-primary/20 px-3 py-1.5 rounded hover:bg-brand-primary hover:text-white transition-all text-brand-primary whitespace-nowrap">Explore Plans</button>
          </div>

          {/* Marketplace Intelligent Sorting & Control Bar */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-lg bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center font-bold text-brand-primary text-sm">
                {view === "jobs" ? sortedJobs.length : sortedTalents.length}
              </div>
              <div>
                <span className="text-[9px] font-black tracking-widest text-emerald-400 font-mono block">LIVE MATCH SECTOR_</span>
                <p className="text-xs font-semibold text-white">
                  {view === "jobs" 
                    ? `${sortedJobs.length} aligned listings found` 
                    : `${sortedTalents.length} vetted candidates standing ready`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Order:</span>
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
                className="bg-white/5 border border-white/10 text-xs font-semibold text-white px-3.5 py-1.5 rounded-lg outline-none cursor-pointer focus:border-brand-primary transition-all w-full sm:w-auto"
              >
                <option value="recent">Recently Posted Status</option>
                <option value="skill-fit">🎯 Best Skill Alignment Match</option>
                {view === "jobs" && <option value="rate-high">💰 Highest Rate & Budget</option>}
              </select>
            </div>
          </div>

          {/* Conditional Guidance Banners */}
          {sortBy === "skill-fit" && user?.role === 'worker' && (!user.skills || user.skills.length === 0) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-start gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20 font-bold">!</div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">No Skills Listed on Your Profile</h4>
                <p className="text-xs text-gray-400">Add proficient skills inside your profile area to unlock customized match weights and prioritize aligned opportunities first.</p>
                <button 
                  onClick={() => navigate("/profile")}
                  className="text-xs text-brand-primary font-bold hover:underline block pt-1"
                >
                  Configure Core Skills now →
                </button>
              </div>
            </motion.div>
          )}

          {sortBy === "skill-fit" && user?.role === 'employer' && (!myJobs || myJobs.length === 0) && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-start gap-3 text-left"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0 border border-amber-500/20 font-bold">!</div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white">No Active Postings Found</h4>
                <p className="text-xs text-gray-400">In order to calculate mutual skill fit percentages, you must have active job listings with requirements.</p>
                <button 
                  onClick={() => navigate("/profile")} // Employer manage active listings
                  className="text-xs text-brand-primary font-bold hover:underline block pt-1"
                >
                  Go to dashboard postings →
                </button>
              </div>
            </motion.div>
          )}

          {loading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {[1,2,3,4,5,6].map(i => <div key={i} className="h-44 rounded-xl bg-white/[0.02] animate-pulse border border-white/5"></div>)}
             </div>
          ) : view === "jobs" ? (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedJobs.map(job => (
                  <JobCard 
                    key={job.id}
                    id={job.id}
                    urgent={job.is_urgent || job.title.toLowerCase().includes('urgent')}
                    title={job.title}
                    employer={job.company_name}
                    rate={job.budget || `${job.min_salary}-${job.max_salary} BDT/Mo`}
                    shifts={job.type}
                    location={job.location}
                    slots={job.requirements_count || 1}
                    onApply={handleApply}
                    onSave={handleSave}
                    onLike={handleLike}
                    isApplying={actionLoading === job.id}
                    hasApplied={appliedJobIds.includes(job.id)}
                    isSaved={savedJobIds.includes(job.id)}
                    isActionLoading={actionLoading === `save-${job.id}`}
                    isVerified={job.employer_verified === 'verified'}
                    skills={job.skills}
                    matchPercentage={job.matchPercentage}
                    matchingSkills={job.matchingSkills}
                  />
                ))}
                {sortedJobs.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 bg-[#111827] border border-white/[0.06] rounded-xl text-center">
                      <Briefcase className="w-10 h-10 text-gray-500" />
                      <div className="space-y-1">
                        <p className="text-white font-bold text-sm">No Active Listings</p>
                        <p className="text-xs text-gray-400">Try loosening your filters or update your query terms.</p>
                      </div>
                      <button onClick={() => { setSearchQuery(""); setSelectedCategory(null); }} className="text-brand-primary text-xs font-semibold hover:underline">Reset Search</button>
                   </div>
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="popLayout">
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedTalents.map(t => (
                  <CandidateCard 
                    key={t.id}
                    id={t.id}
                    name={t.name || "Anonymous Candidate"}
                    level={t.level || 1}
                    trust={`${t.trust_score || 90}%`}
                    speed={t.verification_status === 'verified' ? "Instant" : "Reliable"}
                    image={t.profile_image_url || t.name?.[0] || 'U'}
                    status={t.availability || "Available"}
                    school={t.university || "Vetted Candidate"}
                    onMessage={() => navigate(`/messages?user=${t.id}`)}
                    onHire={() => handleHireClick(t)}
                    isActionLoading={actionLoading === t.id}
                    isVerified={t.verification_status === 'verified'}
                    skills={t.skills}
                    matchPercentage={t.matchPercentage}
                    matchingSkills={t.matchingSkills}
                  />
                ))}
                {sortedTalents.length === 0 && (
                   <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4 bg-[#111827] border border-white/[0.06] rounded-xl text-center">
                      <Users className="w-10 h-10 text-gray-500" />
                      <p className="text-gray-400 text-xs font-medium">No candidates fit the specific filter metrics.</p>
                   </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* Hiring Modal */}
      <AnimatePresence>
        {selectedTalent && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setSelectedTalent(null)}
               className="absolute inset-0 bg-black/70 backdrop-blur-sm"
             />
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 10 }}
               className="relative bg-[#111827] border border-white/[0.08] rounded-xl w-full max-w-sm p-6 space-y-5 shadow-xl text-left"
             >
                <div className="text-center space-y-1">
                   <Zap className="w-6 h-6 text-brand-primary fill-current mx-auto mb-1" />
                   <h2 className="text-lg font-bold text-white tracking-tight">Recruit {selectedTalent.name}</h2>
                   <p className="text-xs text-gray-400">Select which posting this recruitment proposal belongs to:</p>
                </div>
                <div className="space-y-3">
                   <select 
                     className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-primary"
                     value={hiringData.jobId}
                     onChange={(e) => setHiringData({ jobId: e.target.value })}
                   >
                      <option value="">Select Target Post</option>
                      {myJobs.map((j: any) => <option key={j.id} value={j.id}>{j.title}</option>)}
                   </select>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                   <button onClick={() => handleAction("interview")} className="py-2 bg-white/5 border border-white/10 text-white rounded-lg text-xs font-semibold hover:bg-white/10 transition-all">Schedule Call</button>
                   <button onClick={() => handleAction("hire")} className="py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold hover:bg-brand-secondary transition-all">Instant Hire</button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FilterSection = ({ label, children }: { label: string, children: React.ReactNode }) => (
  <div className="space-y-2 text-left">
    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
);

const FilterChip = ({ label, active, onClick }: { label: string, active?: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-3 py-1 rounded text-xs font-semibold transition-all border",
      active ? "bg-brand-primary text-white border-brand-primary" : "bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white"
    )}
  >
    {label}
  </button>
);

export default Marketplace;
