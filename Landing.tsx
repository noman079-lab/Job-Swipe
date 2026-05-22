import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useScroll } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Sparkles, Zap, Shield, Users, Plus, 
  GraduationCap, MessageSquare, Bookmark, Heart, 
  X, ArrowRight, MousePointer2, Briefcase,
  Clock, Globe, Laptop, CheckCircle2,
  Brain, FileSearch, Mic2, BarChart, Smartphone, MapPin, Quote,
  Loader2
} from "lucide-react";
import { cn } from "../utils/cn";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

const Landing = () => {
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  const [urgentJobs, setUrgentJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  });

  useEffect(() => {
    fetchUrgentJobs();
  }, []);

  const fetchUrgentJobs = async () => {
    try {
      const res = await apiFetch("/api/jobs");
      if (res.ok) {
        const data = await res.json();
        // For demo/landing, show top 3 jobs as "Urgent" 
        setUrgentJobs(data.slice(0, 3));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleApply = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!user) {
      toast.error("Please login to apply");
      return;
    }

    if (user.role === 'employer') {
      toast.error("Employers cannot apply to jobs");
      return;
    }

    setActionLoading(jobId);
    try {
      const res = await apiFetch("/api/jobs/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success("Application sent! 🚀");
      } else {
        toast.warning("Check your application status");
      }
    } catch (err) {
      toast.error("Failed to apply");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast.error("Please login to save jobs");
      return;
    }

    try {
      const res = await apiFetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.saved ? "Job saved! 📂" : "Job removed from curiosity list");
      }
    } catch (err) {
      toast.error("Failed to save job");
    }
  };

  const handleLike = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!user) {
      toast.error("Please login to like jobs");
      return;
    }

    try {
      const res = await apiFetch(`/api/jobs/${jobId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(data.liked ? "Added to favorites! ❤️" : "Removed from favorites");
      }
    } catch (err) {
      toast.error("Failed to like");
    }
  };

  return (
    <div ref={containerRef} className="relative bg-[#050505] text-white selection:bg-brand-primary selection:text-white overflow-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#050505]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-fuchsia-600/5 blur-[120px]" />
      </div>

      <main className="relative z-10 flex flex-col items-center">
        {/* --- HERO SECTION --- */}
        <section className="relative w-full min-h-screen flex flex-col items-center justify-center pt-20 px-4 overflow-hidden">
          {/* Grid Pattern */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

          <div className="max-w-7xl mx-auto flex flex-col items-center text-center space-y-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-brand-primary text-[10px] font-bold uppercase tracking-[0.2em] backdrop-blur-md"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-primary"></span>
              </span>
              <span>AI-Powered Matching Live in Dhaka</span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="text-5xl md:text-[80px] font-extrabold tracking-tight leading-[1.05] text-white"
            >
              Swipe, Match & <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-indigo-500">Get Hired Faster</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1 }}
              className="text-gray-400 max-w-2xl text-lg md:text-xl font-normal leading-relaxed"
            >
              Find jobs that match your skills instantly. AI-powered matching for the modern student and worker in Bangladesh.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-6 pt-4"
            >
              <Link to="/find-work" className="group relative btn-primary h-16 px-12 rounded-2xl flex items-center justify-center space-x-4 overflow-hidden border border-brand-primary/20 shadow-md hover:shadow-lg transition-all">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500" />
                <span className="text-sm font-black uppercase tracking-widest relative z-10 text-white">Start Swiping Jobs</span>
                <Zap className="w-5 h-5 relative z-10 group-hover:scale-125 transition-transform text-white" />
              </Link>
              
              <Link to="/pricing" className="group h-16 px-12 rounded-2xl flex items-center justify-center space-x-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all font-black uppercase tracking-widest text-xs text-gray-300">
                <span>Hire Workers Now</span>
                <Users className="w-5 h-5 text-gray-500 group-hover:text-brand-primary transition-colors" />
              </Link>
            </motion.div>

            {/* Trusted Universities */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1, duration: 2 }}
              className="pt-20 w-full"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-500 mb-8">Talented candidates from leading institutions</p>
              <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-6 opacity-40">
                <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-300">Dhaka University</span>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-300">NSU</span>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-300">BracU</span>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-300">BUET</span>
                <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-300">IUB</span>
              </div>
            </motion.div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce">
            <MousePointer2 className="w-6 h-6 text-brand-primary opacity-50 rotate-90" />
          </div>
        </section>

        {/* --- HOW IT WORKS --- */ }
        <section className="w-full py-32 px-4 bg-[#080808]">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white">How It <span className="text-brand-primary">Works</span></h2>
              <p className="text-gray-400 font-medium text-sm">A seamless experience for both candidates and employers.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <StepCard 
                step="01"
                icon={<Briefcase className="w-8 h-8 text-brand-primary" />}
                title="Swipe Jobs"
                description="Browse curated hourly gigs and student jobs. Swipe right if the pay and role match your vibe."
              />
              <StepCard 
                step="02"
                icon={<Heart className="w-8 h-8 text-fuchsia-500" />}
                title="Match & Chat"
                description="If the employer likes your profile too, it's a match! Open a direct line to start coordination."
              />
              <StepCard 
                step="03"
                icon={<Zap className="w-8 h-8 text-amber-500" />}
                title="Start Working"
                description="Show up, complete the task, and get paid instantly through our secure system."
              />
            </div>
          </div>
        </section>

        {/* --- INTERACTIVE SWIPE DEMO --- */}
        <section className="w-full py-32 px-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-20" />
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <div className="space-y-8 order-2 lg:order-1">
              <motion.div 
                whileInView={{ x: [0, 10, 0] }}
                className="inline-flex items-center space-x-2 text-brand-primary font-bold uppercase text-[10px] tracking-widest bg-brand-primary/10 px-4 py-2 rounded-lg"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Modern Discovery</span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">Experience <br /> <span className="text-brand-primary">The Swipe Ecosystem.</span></h2>
              <p className="text-gray-400 text-lg leading-relaxed max-w-lg">
                Traditional job boards are a graveyard of resumes. On Job Swipe, visibility is instant. 
                Employers see your best assets first. You find gigs while scrolling on your commute.
              </p>
              <div className="space-y-4">
                 <CheckItem text="Swipe-to-hire deck for fast browsing" />
                 <CheckItem text="Real-time match notifications" />
                 <CheckItem text="Direct chat with hiring managers" />
              </div>
            </div>
            
            <div className="order-1 lg:order-2">
              <SwipeDemo />
            </div>
          </div>
        </section>

        {/* --- JOB CATEGORIES --- */}
        <section className="w-full py-32 px-4 bg-white/[0.02] border-y border-white/5">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:flex-row items-end justify-between gap-6">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white">Popular <span className="text-brand-primary">Sectors</span></h2>
                <p className="text-gray-400 font-medium text-sm">Curated categories tailored for student-friendly opportunities</p>
              </div>
              <Link to="/find-work" className="btn-outline px-6 py-3 text-[10px] uppercase font-black tracking-widest border-white/10 bg-white/5 h-12 flex items-center">Explore All Sectors</Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <CategoryCard icon={<GraduationCap />} title="Tuition Jobs" jobs="2.4k active" color="emerald" path="/tuition" />
              <CategoryCard icon={<Clock />} title="Part-Time Roles" jobs="5.1k active" color="brand" path="/marketplace?type=part-time" />
              <CategoryCard icon={<Globe />} title="Freelance Gigs" jobs="1.8k active" color="fuchsia" path="/marketplace?type=gig" />
              <CategoryCard icon={<Zap />} title="Hourly Work" jobs="3.2k active" color="amber" path="/marketplace?type=hourly" />
              <CategoryCard icon={<Laptop />} title="Remote Jobs" jobs="900 active" color="blue" path="/marketplace?location=remote" />
              <CategoryCard icon={<Plus />} title="Internships" jobs="1.1k active" color="rose" path="/marketplace?type=internship" />
            </div>
          </div>
        </section>

        {/* --- HOURLY HIGHLIGHTS --- */}
        <section className="w-full py-32 px-4 relative">
          <div className="max-w-7xl mx-auto flex flex-col items-center space-y-16">
            <div className="text-center space-y-3">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white">Active <span className="text-brand-primary">Opportunities</span></h2>
              <p className="text-gray-400 font-medium text-sm">Hourly roles and gigs looking to hire immediately</p>
            </div>

            <div className="w-full flex flex-wrap justify-center gap-6">
                {loadingJobs ? (
                  <div className="flex gap-6">
                    {[1,2,3].map(i => <div key={i} className="w-[280px] h-64 rounded-3xl bg-white/5 animate-pulse"></div>)}
                  </div>
                ) : urgentJobs.map(job => (
                  <UrgentCard 
                    key={job.id}
                    job={job}
                    onApply={handleApply}
                    onSave={handleSave}
                    onLike={handleLike}
                    isApplying={actionLoading === job.id}
                  />
                ))}
                {urgentJobs.length === 0 && !loadingJobs && (
                  <p className="text-gray-500 font-black uppercase text-xs">No active jobs found today</p>
                )}
            </div>
          </div>
        </section>

        {/* --- AI FEATURES --- */}
        <section className="w-full py-32 px-4 bg-[#0D0D0D] border-y border-white/5 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
               <div className="inline-flex items-center space-x-2 text-brand-primary px-3 py-1 bg-brand-primary/10 rounded-full border border-brand-primary/20 text-[9px] font-semibold uppercase tracking-wider mb-2">
                 <Brain className="w-3.5 h-3.5" />
                 <span>Smart Recruitment</span>
               </div>
               <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white">AI-Powered <span className="text-brand-primary">Analytics</span></h2>
               <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">Advanced similarity algorithms matching candidates with precision.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               <AiFeatureCard 
                icon={<Zap className="w-6 h-6 text-amber-500" />}
                title="Smart Matching"
                description="AI analyzes your skills & swipe history to present jobs you're 90% likely to match."
               />
               <AiFeatureCard 
                icon={<FileSearch className="w-6 h-6 text-emerald-500" />}
                title="Resume Audit"
                description="Instant feedback on your portfolio to increase match rates by up to 300%."
               />
               <AiFeatureCard 
                icon={<Mic2 className="w-6 h-6 text-violet-500" />}
                title="AI Prep"
                description="Practice mock interviews with our AI bot based on specific company data."
               />
               <AiFeatureCard 
                icon={<BarChart className="w-6 h-6 text-blue-500" />}
                title="Market Pricing"
                description="Data-driven hourly rate suggestions based on current demand in your area."
               />
            </div>
          </div>
        </section>

        {/* --- TRUST & SAFETY --- */}
        <section className="w-full py-32 px-4 bg-gradient-to-br from-[#050505] to-[#080808]">
           <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
             <div className="relative">
                <div className="absolute inset-0 bg-brand-primary/20 blur-[100px] rounded-full animate-pulse" />
                <div className="relative bento-card border-brand-primary/30 p-12 space-y-8 bg-black">
                   <Shield className="w-16 h-16 text-brand-primary" />
                   <h3 className="text-4xl font-extrabold tracking-tight text-white mb-2">Safe & <span className="text-brand-primary">Verified</span></h3>
                   <ul className="space-y-4">
                     <li className="flex items-start space-x-3 text-left">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-sm">NID Background Checks</p>
                          <p className="text-xs text-gray-400">All employers and workers must pass mandatory NID verification.</p>
                        </div>
                     </li>
                     <li className="flex items-start space-x-3 text-left">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-sm">Escrow Protection</p>
                          <p className="text-xs text-gray-400">Payments are held securely by Job Swipe until work is completed.</p>
                        </div>
                     </li>
                     <li className="flex items-start space-x-3 text-left">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-bold text-sm">Rating Accountability</p>
                          <p className="text-xs text-gray-400">Our two-way rating system ensures professional behavior at all times.</p>
                        </div>
                     </li>
                   </ul>
                </div>
             </div>
             <div className="space-y-8 text-center lg:text-left">
                <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">Peace of mind <br /> <span className="text-brand-primary">in Every Match.</span></h2>
                <p className="text-gray-400 text-base leading-relaxed max-w-lg mx-auto lg:mx-0">
                  Hiring a stranger can be scary. Our audit engine scans profiles for red flags and verifies identity before they can even message you.
                </p>
                <div className="flex justify-center lg:justify-start gap-12">
                   <div className="text-left">
                     <p className="text-3xl font-extrabold text-white">100%</p>
                     <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Identity Verified</p>
                   </div>
                   <div className="text-left">
                     <p className="text-3xl font-extrabold text-white">0%</p>
                     <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Fraud Tolerance</p>
                   </div>
                </div>
             </div>
           </div>
        </section>

        {/* --- TESTIMONIALS --- */}
        <section className="w-full py-32 px-4 bg-[#040404]">
          <div className="max-w-7xl mx-auto space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-none text-white">What Our <span className="text-brand-primary">Community Says</span></h2>
              <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Stories from the frontline</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
               <TestimonialCard 
                name="Abrar Ahmed" 
                role="NSU Student" 
                text="I found 3 tuition jobs in a single weekend. The swiping interface is so addictive, I actually enjoy looking for work now."
               />
               <TestimonialCard 
                name="Sarah Kabir" 
                role="Marketing Manager" 
                text="Finding event staff used to take days. With Job Swipe, I had 50 qualified applicants in 2 hours. The verification badge makes hiring easy."
               />
               <TestimonialCard 
                name="Imran Khan" 
                role="Freelance UI Designer" 
                text="I love the escrow system. No more chasing clients for payments. Job Swipe takes the stress out of hourly gigs."
               />
            </div>
          </div>
        </section>

        {/* --- FINAL CTA --- */}
        <section className="w-full py-32 px-4 relative">
           <div className="max-w-5xl mx-auto bento-card border border-brand-primary/20 p-12 md:p-20 flex flex-col items-center text-center space-y-10 rounded-[48px] overflow-hidden bg-card-bg">
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/5 blur-[100px] -z-10 rounded-full" />
             
             <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight mb-2">Start Your <br /> <span className="text-brand-primary">Career Today</span></h2>
             <p className="text-gray-400 text-lg md:text-base font-normal max-w-xl mx-auto">
               The next swipe away is your next paycheck. Join the fastest growing talent ecosystem in Bangladesh.
             </p>
             
             <motion.div 
               whileHover={{ scale: 1.02 }}
               whileTap={{ scale: 0.98 }}
             >
                <Link to="/find-work" className="btn-primary h-14 px-10 rounded-xl text-sm font-semibold tracking-wide shadow-lg shadow-brand-primary/10 flex items-center justify-center space-x-3 text-white">
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </Link>
             </motion.div>

             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest pt-4">No credit card required • Verified for students</p>
           </div>
        </section>
      </main>
    </div>
  );
};

const StepCard = ({ step, icon, title, description }: any) => (
  <div className="bento-card group hover:border-brand-primary/30 transition-all duration-300 flex flex-col items-center text-center p-8 space-y-6 bg-card-bg">
    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative transition-transform duration-300">
      <div className="absolute -top-2 -right-2 text-2xl font-bold text-gray-500/20">{step}</div>
      {icon}
    </div>
    <div className="space-y-2 relative z-10">
      <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const CheckItem = ({ text }: { text: string }) => (
  <div className="flex items-center space-x-3 group">
    <div className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
    </div>
    <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">{text}</span>
  </div>
);

const CategoryCard = ({ icon, title, jobs, color, path }: any) => {
  const navigate = useNavigate();
  return (
    <div 
      onClick={() => navigate(path || "/marketplace")}
      className="bento-card p-8 group hover:scale-[1.01] active:scale-99 transition-all relative overflow-hidden text-left cursor-pointer bg-card-bg"
    >
      <div className={cn(
        "absolute -top-10 -right-10 w-40 h-40 opacity-5 blur-[60px] rounded-full group-hover:opacity-10 transition-opacity",
        color === 'brand' ? 'bg-brand-primary' : 
        color === 'emerald' ? 'bg-emerald-500' :
        color === 'fuchsia' ? 'bg-fuchsia-500' :
        color === 'amber' ? 'bg-amber-500' :
        color === 'blue' ? 'bg-blue-500' : 'bg-rose-500'
      )} />
      <div className="flex flex-col h-full space-y-6 relative z-10">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center border transition-all duration-300",
          color === 'brand' ? 'bg-brand-primary/10 border-brand-primary/20 text-brand-primary' : 
          color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
          color === 'fuchsia' ? 'bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-500' :
          color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' :
          color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' :
          'bg-rose-500/10 border-rose-500/20 text-rose-500'
        )}>
          {React.cloneElement(icon as React.ReactElement<any>, { className: "w-6 h-6" })}
        </div>
        <div>
          <h4 className="text-lg font-bold text-white tracking-tight">{title}</h4>
          <p className="text-xs text-gray-500 mb-4">{jobs}</p>
          <div className="h-px w-full bg-white/5 mb-4" />
          <button className="flex items-center space-x-2 text-xs font-medium text-gray-400 group-hover:text-white transition-colors">
            <span>View Listings</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};

const UrgentCard = ({ job, onApply, onSave, onLike, isApplying }: { job: any, onApply: (id: string, e: React.MouseEvent) => void, onSave: (id: string, e: React.MouseEvent) => void, onLike: (id: string, e: React.MouseEvent) => void, isApplying: boolean }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isUrgent = job.budget?.toLowerCase().includes('urgent') || job.description?.toLowerCase().includes('urgent') || job.urgent;
  return (
    <motion.div 
      whileHover={{ y: -3 }}
      onClick={() => navigate(`/jobs/${job.id}`)}
      className={cn(
        "w-full max-w-[280px] bg-[#111827] border border-white/[0.06] p-5 rounded-xl space-y-3 hover:border-brand-primary/35 transition-all relative text-left cursor-pointer shadow-sm",
        isUrgent && "border-rose-500/20 bg-rose-500/[0.01]"
      )}
    >
      <div className="absolute top-4 right-4 flex items-center space-x-1.5">
         <button 
           onClick={(e) => onSave(job.id, e)}
           className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-brand-primary"
           title="Bookmark Job"
         >
           <Bookmark className="w-3.5 h-3.5" />
         </button>
         <button 
           onClick={(e) => onLike(job.id, e)}
           className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-rose-500"
           title="Favorite"
         >
           <Heart className="w-3.5 h-3.5" />
         </button>
         {isUrgent && <div className="bg-rose-500 w-1.5 h-1.5 rounded-full" />}
      </div>
      
      <div className="space-y-0.5 pr-8">
        <h5 className="font-bold text-white text-base truncate leading-snug">{job.title}</h5>
        <p className="text-xs text-gray-400 font-medium truncate">{job.company_name || "Verified Client"}</p>
      </div>

      <div className="flex items-center space-x-1.5 text-gray-400 text-xs">
        <MapPin className="w-3.5 h-3.5 text-gray-500" />
        <span className="truncate">{job.location || "Remote"}</span>
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-white/[0.04]">
        <span className="text-emerald-400 font-bold text-sm">{job.budget}</span>
        <div className="flex space-x-1">
          {job.employer_verified === 'verified' && (
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 bg-brand-primary/10 border border-brand-primary/20 rounded text-brand-primary">Verified</span>
          )}
        </div>
      </div>

      {user?.role !== 'employer' && (
        <button 
          disabled={isApplying}
          onClick={(e) => onApply(job.id, e)}
          className="w-full btn-primary py-2 rounded-lg text-xs font-semibold shadow-sm text-white mt-1"
        >
          {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-white" /> : "Apply Now"}
        </button>
      )}
    </motion.div>
  );
};

const AiFeatureCard = ({ icon, title, description }: any) => (
  <div className="bento-card p-6 group hover:bg-brand-primary/5 transition-all text-left bg-card-bg">
    <div className="space-y-4">
       <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">{icon}</div>
       <div className="space-y-1">
         <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
         <p className="text-gray-400 text-xs leading-relaxed">{description}</p>
       </div>
    </div>
  </div>
);

const TestimonialCard = ({ name, role, text }: any) => (
  <div className="bento-card p-8 space-y-6 flex flex-col relative overflow-hidden group text-left bg-card-bg">
    <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
    <Quote className="w-8 h-8 text-brand-primary/20 rotate-180" />
    <p className="text-gray-300 font-normal leading-relaxed relative z-10 text-sm">"{text}"</p>
    <div className="flex items-center space-x-3 pt-4 border-t border-white/5 relative z-10">
      <div className="w-10 h-10 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold">{name[0]}</div>
      <div>
        <p className="text-sm font-semibold text-white tracking-tight">{name}</p>
        <p className="text-xs text-gray-400 font-medium">{role}</p>
      </div>
    </div>
  </div>
);

const SwipeDemo = () => {
  const [currentCard, setCurrentCard] = useState(0);
  const [swipeDir, setSwipeDir] = useState<null | 'left' | 'right'>(null);
  
  const cards = [
    { title: "React Developer", company: "Augmedix", pay: "৳45,000", location: "Dhaka", color: "blue" },
    { title: "Home Tutor", company: "Private Client", pay: "৳800/hr", location: "Gulshan", color: "amber" },
    { title: "Event Staff", company: "Red Carpet", pay: "৳1,500/day", location: "Banani", color: "fuchsia" },
    { title: "Content Writer", company: "Sheba.xyz", pay: "৳3,000/week", location: "Remote", color: "emerald" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      const dir = Math.random() > 0.5 ? 'right' : 'left';
      setSwipeDir(dir);
      
      setTimeout(() => {
        setSwipeDir(null);
        setCurrentCard(prev => (prev + 1) % cards.length);
      }, 800);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative w-80 aspect-[3/4] mx-auto group">
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentCard}
          initial={{ scale: 0.8, opacity: 0, rotate: 0, y: 50 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            rotate: swipeDir === 'right' ? 20 : swipeDir === 'left' ? -20 : 0,
            x: swipeDir === 'right' ? 400 : swipeDir === 'left' ? -400 : 0,
          }}
          exit={{ opacity: 0, scale: 1.1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={cn(
            "absolute inset-0 bento-card border-white/10 shadow-2xl p-0 overflow-hidden flex flex-col",
            "bg-[#0D0D0D] text-left"
          )}
        >
          <div className={cn(
            "h-48 relative overflow-hidden",
            cards[currentCard].color === 'blue' ? 'bg-blue-600/20' :
            cards[currentCard].color === 'amber' ? 'bg-amber-600/20' :
            cards[currentCard].color === 'fuchsia' ? 'bg-fuchsia-600/20' : 'bg-emerald-600/20'
          )}>
            <div className="absolute inset-x-0 top-0 h-10 flex items-center px-4 space-x-2 bg-black/20 backdrop-blur-md">
               <div className="flex space-x-1">
                 <div className="w-2 h-2 rounded-full bg-red-500/50" />
                 <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                 <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
               </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
               <Briefcase className="w-24 h-24" />
            </div>
          </div>
          
          <div className="p-8 flex flex-col items-center text-center space-y-6">
            <div className="space-y-1">
              <h4 className="text-xl font-bold text-white tracking-tight">{cards[currentCard].title}</h4>
              <p className="text-xs text-gray-400 font-medium">{cards[currentCard].company}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="px-2.5 py-1 bg-[#1a2e35] text-emerald-400 border border-emerald-500/15 rounded-md text-xs font-semibold">{cards[currentCard].pay}</div>
              <div className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-md text-xs text-gray-300">{cards[currentCard].location}</div>
            </div>
          </div>

          <div className="mt-auto p-8 pt-0 flex justify-center space-x-4">
             <div className={cn(
               "w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center transition-all duration-300",
               swipeDir === 'left' ? "bg-red-500/20 border-red-500/50 scale-125" : ""
             )}>
                <X className="w-6 h-6 text-gray-500" />
             </div>
             <div className={cn(
               "w-12 h-12 rounded-full border border-white/10 bg-white/5 flex items-center justify-center transition-all duration-300",
               swipeDir === 'right' ? "bg-emerald-500/20 border-emerald-500/50 scale-125 shadow-[0_0_20px_rgba(16,185,129,0.3)] text-emerald-400" : ""
             )}>
                <Heart className={cn("w-6 h-6", swipeDir === 'right' ? "fill-emerald-400" : "text-gray-500")} />
             </div>
          </div>
          
          {swipeDir === 'right' && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-10 left-10 rotate-[-20deg] border-4 border-emerald-500 px-4 py-2 rounded-xl">
               <span className="text-xl font-semibold text-emerald-400">Match Like</span>
            </motion.div>
          )}
          {swipeDir === 'left' && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="absolute top-10 right-10 rotate-[20deg] border-4 border-red-500 px-4 py-2 rounded-xl">
               <span className="text-xl font-semibold text-red-400">Pass</span>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Decorative Stack */}
      <div className="absolute inset-0 -z-10 translate-x-4 translate-y-4 rounded-[40px] bg-white/5 opacity-50 border border-white/10 pointer-events-none" />
      <div className="absolute inset-0 -z-20 translate-x-8 translate-y-8 rounded-[40px] bg-white/5 opacity-20 border border-white/10 pointer-events-none" />
    </div>
  );
};

export default Landing;
