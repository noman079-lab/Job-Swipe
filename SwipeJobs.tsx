import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react";
import { X, Heart, MapPin, Briefcase, DollarSign, Info, Loader2, Bookmark, Zap, Clock } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { jobService } from "../services/jobService";
import { cn } from "../utils/cn";

interface Job {
  id: string;
  title: string;
  employer_id: string;
  location: string;
  budget: string;
  description: string;
  skills: string[];
  type?: string;
  created_at: string;
  company_name?: string;
  employer_verified?: string;
}

const SwipeJobs = () => {
  const { user, apiFetch } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [swipedDirection, setSwipedDirection] = useState<number>(0);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await jobService.getJobs();
      setJobs(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const heartOpacity = useTransform(x, [50, 150], [0, 1]);
  const nopeOpacity = useTransform(x, [-150, -50], [1, 0]);

  useEffect(() => {
    x.set(0);
    setSwipedDirection(0);
  }, [currentIndex]);

  const handleSwipe = async (direction: "left" | "right") => {
    if (currentIndex >= jobs.length) return;
    
    setSwipedDirection(direction === "left" ? -1000 : 1000);
    const job = jobs[currentIndex];

    if (direction === "right") {
       if (!user) {
         toast.error("Please login to swipe right");
         return;
       }
       try {
         await jobService.likeJob(apiFetch, job.id);
         toast.success("Interest sent! ❤️");
       } catch (err: any) {
         toast.error("Interaction failed");
       }
    }
    
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
    }, 100);
  };

  const handleSave = async () => {
    if (!user) return toast.error("Please login first");
    const job = jobs[currentIndex];
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.saved ? "Saved to bookmarks" : "Removed from bookmarks");
      }
    } catch (err) {
      toast.error("Network failure");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
          <Briefcase className="w-4 h-4 text-brand-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <p className="text-xs font-semibold text-gray-400 animate-pulse">Loading opportunities...</p>
      </div>
    );
  }

  if (jobs.length === 0 || currentIndex >= jobs.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-6 text-center px-6">
        <div className="w-16 h-16 bg-brand-primary/5 rounded-2xl flex items-center justify-center border border-brand-primary/10">
           <Zap className="w-8 h-8 text-brand-primary" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-white">All Caught Up</h2>
          <p className="text-gray-400 font-medium max-w-xs text-xs leading-relaxed">You've reached the end of the current postings. Check back soon or browse the Marketplace.</p>
        </div>
        <div className="flex flex-col w-full max-w-xs gap-3">
          <button onClick={fetchJobs} className="w-full py-2.5 bg-brand-primary text-white text-xs font-semibold rounded-lg hover:bg-brand-secondary transition-all">Reload Jobs</button>
          <button onClick={() => window.location.href='/marketplace'} className="w-full py-2.5 bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold rounded-lg hover:bg-white/10 transition-all">Browse Marketplace</button>
        </div>
      </div>
    );
  }

  const currentJob = jobs[currentIndex];

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] relative pt-8 overflow-hidden px-4">
      <div className="w-full max-w-[400px] relative aspect-[4/5.5]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentJob.id}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.9}
            onDragEnd={(_, info) => {
              if (info.offset.x > 120) handleSwipe("right");
              else if (info.offset.x < -120) handleSwipe("left");
            }}
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ 
              x: swipedDirection, 
              opacity: 0, 
              scale: 0.9,
              transition: { duration: 0.15 } 
            }}
            whileDrag={{ scale: 1.01 }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing z-20"
          >
            <div className="bg-card-bg border border-white/[0.06] rounded-xl overflow-hidden shadow-xl h-full flex flex-col relative group">
              {/* Card Badge */}
              <div className="absolute top-5 left-5 z-30">
                 <div className="px-2.5 py-0.5 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded text-[10px] font-semibold uppercase tracking-wider">
                   {currentJob.type || 'HIRING'}
                 </div>
              </div>

              {/* Like/Nope Visual Feedback */}
              <motion.div 
                style={{ opacity: heartOpacity }}
                className="absolute top-10 right-10 z-40 border border-emerald-500 text-emerald-500 rounded px-3 py-1 font-bold text-lg transform rotate-12 bg-emerald-500/10 pointer-events-none"
              >
                APPLY
              </motion.div>
              
              <motion.div 
                style={{ opacity: nopeOpacity }}
                className="absolute top-10 left-10 z-40 border border-rose-500 text-rose-500 rounded px-3 py-1 font-bold text-lg transform -rotate-12 bg-rose-500/10 pointer-events-none"
              >
                PASS
              </motion.div>

              <div className="h-2/5 relative bg-gradient-to-b from-brand-primary/5 to-transparent p-6 flex items-end">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <Briefcase className="w-36 h-36 -mr-8 -mt-8 text-white" />
                </div>
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-semibold text-brand-primary">{currentJob.company_name || 'Verified Employer'}</span>
                    {currentJob.employer_verified === 'verified' && (
                      <Zap className="w-3 h-3 text-brand-primary fill-current" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold tracking-tight leading-snug text-left text-white">{currentJob.title}</h3>
                  <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-base">
                     <span>{currentJob.budget}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col space-y-4 text-left">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1.5 text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span>{currentJob.location}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-gray-400 text-[10px] font-semibold tracking-wider uppercase">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>Recent</span>
                  </div>
                </div>
                
                <p className="text-gray-400 text-xs leading-relaxed font-normal line-clamp-5">
                  {currentJob.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-2 mt-auto">
                  {currentJob.skills?.slice(0, 4).map((tag, idx) => (
                    <span key={`${tag}-${idx}`} className="text-xs px-2 py-0.5 bg-white/5 border border-white/5 rounded text-gray-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stack background effect */}
          {currentIndex + 1 < jobs.length && (
            <div className="absolute inset-0 translate-y-3 scale-95 opacity-40 z-10">
               <div className="bg-card-bg border border-white/[0.04] rounded-xl h-full shadow-md"></div>
            </div>
          )}
          {currentIndex + 2 < jobs.length && (
            <div className="absolute inset-0 translate-y-6 scale-[0.9] opacity-20 z-0">
               <div className="bg-card-bg border border-white/[0.04] rounded-xl h-full"></div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Swipe Controls */}
      <div className="flex items-center space-x-6 mt-8 mb-6 relative z-30">
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSwipe("left")} 
          className="w-12 h-12 rounded-full border border-rose-500/20 bg-rose-500/5 text-rose-500 flex items-center justify-center hover:bg-rose-500/10 transition-all shadow-sm"
        >
          <X className="w-5 h-5" />
        </motion.button>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSave} 
          disabled={actionLoading}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
        >
          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bookmark className="w-4 h-4" />}
        </motion.button>

        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSwipe("right")} 
          className="w-14 h-14 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-500 flex items-center justify-center hover:bg-emerald-500/10 transition-all shadow-md"
        >
          <Heart className="w-6 h-6 fill-current" />
        </motion.button>
      </div>

      {/* Instructions */}
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest space-x-4">
        <span>← Swipe Left to Pass</span>
        <span className="text-gray-700">•</span>
        <span>Swipe Right to Apply →</span>
      </div>
    </div>
  );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
    <div className="flex items-center space-x-1.5 text-gray-400 mb-1">
      {icon}
      <span className="text-[10px] uppercase font-semibold tracking-wider">{label}</span>
    </div>
    <p className="text-xs font-semibold truncate text-white">{value}</p>
  </div>
);

export default SwipeJobs;
