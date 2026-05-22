import React, { useState, useEffect } from "react";
import { Bookmark, User, MapPin, GraduationCap, ChevronRight, Loader2, Search, Briefcase, Zap } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../utils/cn";

const SavedCandidates = () => {
  const { user, apiFetch } = useAuth();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchSavedCandidates = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/employer/talents/saved");
      if (res.ok) {
        const data = await res.json();
        setCandidates(data);
      }
    } catch (err) {
      toast.error("Failed to load saved candidates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role !== 'employer') {
        navigate("/");
        return;
    }
    fetchSavedCandidates();
  }, [user]);

  const removeCandidate = async (talentId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const res = await apiFetch("/api/employer/talents/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ talentId })
      });
      if (res.ok) {
        toast.success("Bookmark removed");
        setCandidates(prev => prev.filter(c => c.id !== talentId));
      }
    } catch (err) {
      toast.error("Failed to remove bookmark");
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.skills?.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest">
            <Bookmark className="w-3 h-3 fill-current" />
            <span>High Priority Registry</span>
          </div>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter">Bookmarks_</h1>
          <p className="text-gray-500 text-sm font-medium">Your curated list of elite operatives and high-potential talents.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-amber-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Search bookmarks..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 text-xs font-bold outline-none focus:border-amber-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <div key={i} className="h-48 rounded-3xl bg-white/5 animate-pulse border border-white/5" />)}
        </div>
      ) : filteredCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredCandidates.map(c => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={c.id}
                onClick={() => navigate(`/messages?user=${c.id}`)}
                className="bento-card p-6 hover:border-amber-500/30 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4">
                     <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 p-0.5 relative">
                        {c.profile_image_url ? (
                          <img src={c.profile_image_url} alt={c.name} className="w-full h-full object-cover rounded-[14px]" />
                        ) : (
                          <div className="w-full h-full rounded-[14px] bg-white/5 flex items-center justify-center font-black italic text-lg text-gray-600">
                            {c.name?.[0] || "U"}
                          </div>
                        )}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0A0A0A]" />
                     </div>
                     <div>
                        <h3 className="font-black italic uppercase tracking-tight text-lg">{c.name}</h3>
                        <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Level {Math.floor(c.xp / 100) || 1} Talent</p>
                     </div>
                  </div>
                  <button 
                    onClick={(e) => removeCandidate(c.id, e)}
                    className="p-2 hover:bg-rose-500/10 rounded-xl text-gray-600 hover:text-rose-500 transition-all"
                  >
                    <Bookmark className="w-4 h-4 fill-current" />
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                   <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 text-gray-500 mb-1">
                        <GraduationCap className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">University</span>
                      </div>
                      <p className="text-[10px] font-bold truncate">{c.university || "Elite Student"}</p>
                   </div>
                   <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                      <div className="flex items-center space-x-2 text-gray-500 mb-1">
                        <MapPin className="w-3 h-3" />
                        <span className="text-[8px] font-black uppercase">Location</span>
                      </div>
                      <p className="text-[10px] font-bold truncate">{c.location || "Bangladesh"}</p>
                   </div>
                </div>

                <div className="mt-6 flex items-center justify-between gap-4">
                   <div className="flex -space-x-2">
                      {c.skills?.slice(0, 3).map((s: string) => (
                        <div key={s} className="w-7 h-7 rounded-lg bg-[#0A0A0A] border border-white/10 flex items-center justify-center text-[8px] font-black uppercase text-gray-400">
                          {s[0]}
                        </div>
                      ))}
                      {c.skills?.length > 3 && <div className="w-7 h-7 rounded-lg bg-[#0A0A0A] border border-white/10 flex items-center justify-center text-[8px] font-black text-gray-600">+{c.skills.length - 3}</div>}
                   </div>
                   <button className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-brand-primary group-hover:translate-x-1 transition-all">
                      <span>Engage</span>
                      <ChevronRight className="w-3 h-3" />
                   </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center space-y-6 bg-[#0D0D0D] border border-white/5 rounded-[40px] text-center">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-dashed border-white/10">
            <Bookmark className="w-10 h-10 text-gray-700" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black italic uppercase tracking-tighter">No Active Bookmarks_</h3>
            <p className="text-gray-500 text-xs font-medium max-w-xs mx-auto">Establish your talent pipeline by bookmarking elite operatives from the swipe deck.</p>
          </div>
          <Link to="/candidates" className="btn-primary px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand-primary/20">Find Talent Now</Link>
        </div>
      )}

      {/* Suggested Section */}
      <div className="pt-20 border-t border-white/5 space-y-8">
         <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black italic uppercase tracking-tight">Active Directives_</h2>
            <Link to="/create-job" className="text-[10px] font-black uppercase tracking-widest text-brand-primary flex items-center space-x-2 hover:underline">
               <Zap className="w-4 h-4 fill-current" />
               <span>New Listing</span>
            </Link>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Link to="/employer" className="bento-card p-6 flex flex-col justify-between hover:bg-white/5 transition-colors group h-40">
               <Briefcase className="w-8 h-8 text-gray-500 group-hover:text-brand-primary transition-colors" />
               <div>
                  <h4 className="text-sm font-black italic uppercase tracking-tight">Dashboard</h4>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Operational Metrics</p>
               </div>
            </Link>
            <Link to="/messages" className="bento-card p-6 flex flex-col justify-between hover:bg-white/5 transition-colors group h-40">
               <Zap className="w-8 h-8 text-gray-500 group-hover:text-amber-500 transition-colors" />
               <div>
                  <h4 className="text-sm font-black italic uppercase tracking-tight">Intelligence</h4>
                  <p className="text-[9px] text-gray-500 font-bold uppercase mt-1">Active Comms</p>
               </div>
            </Link>
         </div>
      </div>
    </div>
  );
};

export default SavedCandidates;
