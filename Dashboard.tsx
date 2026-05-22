import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Flame, TrendingUp, Briefcase, GraduationCap, MapPin, DollarSign, Clock, Loader2, Fingerprint, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const Dashboard = () => {
  const { user, apiFetch } = useAuth();
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const res = await apiFetch("/api/ai/recommendations");
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
    } finally {
      setLoadingRecs(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 pb-20 pt-6 px-4 max-w-7xl mx-auto">
      
      {/* AI Resume Insight */}
      <div className="col-span-12 md:col-span-3 space-y-6">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden group min-h-[380px] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">AI Skill Match</h3>
              <Fingerprint className="w-4 h-4 text-brand-primary" />
            </div>
            
            <div className="flex justify-center relative my-6">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                <circle cx="64" cy="64" r="54" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="339.2" strokeDashoffset="40" className="text-brand-primary transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white tracking-tight">88%</span>
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Compatibility</span>
              </div>
            </div>

            <div className="space-y-3 ms-0.5">
              <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.04] space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Strong Matches Identified</p>
                <p className="text-xs text-gray-400 font-normal">"Your backend qualifications align directly with remote engineering postings."</p>
              </div>
              <ul className="space-y-2">
                <InsightItem color="bg-brand-primary" text="Strong core Computer Science background." />
                <InsightItem color="bg-amber-400" text="Add missing skills (+12% match multiplier)" />
              </ul>
            </div>
          </div>
          <Link to="/profile" className="btn-primary w-full text-center mt-5 text-xs font-semibold h-10 flex items-center justify-center rounded-lg shadow-sm">
            Optimize Profile
          </Link>
        </div>

        {/* Daily Progress */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col justify-between h-44 group transition-all">
          <div className="flex justify-between items-center">
            <span className="bg-white/5 px-2.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider text-gray-400 border border-white/5">Continuous Progress</span>
            <span className="text-lg font-bold text-white">🔥 {user?.xp ? "9" : "0"} Day Streak</span>
          </div>
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <div className="text-xl font-bold text-white">{user?.xp || 0} <span className="text-xs font-medium text-gray-500">XP Earned</span></div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Level {Math.floor((user?.xp || 0) / 1000) + 1}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(user?.xp || 0) % 1000 / 10}%` }}
                className="h-full bg-brand-primary rounded-full"
              ></motion.div>
            </div>
            <div className="flex justify-between mt-2 text-[9px] text-gray-500 font-semibold uppercase tracking-wider">
              <span>Goal Target</span>
              <span>{Math.floor(((user?.xp || 0) % 1000) / 10)}% Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Feed Header / Swipe Preview */}
      <div className="col-span-12 md:col-span-6 space-y-6">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl overflow-hidden p-0 flex flex-col min-h-[540px]">
          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
            <div className="flex space-x-2">
              <span className="bg-brand-primary/10 text-brand-primary text-[10px] px-2.5 py-0.5 rounded border border-brand-primary/20 uppercase font-semibold">Recommended for you</span>
              <span className="bg-cyan-500/10 text-cyan-400 text-[10px] px-2.5 py-0.5 rounded border border-cyan-500/20 uppercase font-semibold">AI Match Engine</span>
            </div>
            <Link to="/marketplace" className="text-brand-primary text-xs font-semibold hover:underline inline-flex items-center">
              Marketplace
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          
          <div className="flex-1 p-5 relative overflow-hidden flex flex-col space-y-4 text-left">
            {loadingRecs ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                <p className="text-xs font-medium text-gray-400">Loading dynamic recommendations...</p>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-3 w-full">
                {recommendations.map((rec, idx) => (
                  <motion.div 
                    key={`rec-${rec.jobId}-${idx}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link 
                      to={`/jobs/${rec.jobId}`}
                      className="block bg-[#161b22] border border-white/[0.06] p-4 rounded-xl hover:border-brand-primary/30 transition-all group relative"
                    >
                      <div className="absolute top-4 right-4 text-brand-primary font-bold text-sm">
                        {rec.matchScore}% Match
                      </div>
                      <div className="flex items-start space-x-3 text-left">
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white font-bold text-base border border-white/10 shrink-0">
                          {rec.job?.company_name?.[0] || 'J'}
                        </div>
                        <div className="space-y-0.5 min-w-0 pr-16 text-left">
                          <h4 className="font-bold text-white text-sm truncate group-hover:text-brand-primary transition-colors">{rec.job?.title}</h4>
                          <p className="text-[11px] text-gray-400 font-medium">{rec.job?.location} • {rec.job?.budget}</p>
                          <div className="pt-1.5">
                             <p className="text-xs text-brand-primary/90 font-medium">"{rec.matchReason}"</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                ))}
                
                <Link to="/swipe" className="mt-6 w-full h-12 btn-primary flex items-center justify-center space-x-2 text-xs font-semibold rounded-lg shadow-sm">
                  <span>Swipe Openings</span>
                  <Flame className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 bg-white/5 rounded-xl border border-white/[0.06] flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand-primary/40" />
                </div>
                <div className="space-y-1 text-center max-w-xs">
                  <p className="text-sm font-bold text-white">Recommendations Will Appear Here</p>
                  <p className="text-xs text-gray-400">Complete your student profile fields to generate targeted AI matches.</p>
                </div>
                <Link to="/profile" className="px-4 py-2 border border-white/10 hover:bg-white/5 text-gray-300 font-semibold text-xs rounded-lg transition-all mt-2">Build Profile</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trends & Messages (Span 3) */}
      <div className="col-span-12 md:col-span-3 space-y-6 text-left">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col min-h-[220px]">
          <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">Trending Opportunities</h3>
          <div className="space-y-2">
            <TrendItem title="Academic Tutor" stipend="৳ 8,000" location="Dhaka" />
            <TrendItem title="Campus Representative" stipend="৳ 3,000" location="Part-time" />
            <TrendItem title="Media Writer" stipend="৳ 6,000" location="Remote" />
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col min-h-[220px]">
          <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-3">Recent Messages</h3>
          <div className="space-y-2.5">
            <MessagePreviewItem name="ShopUp Corp" time="2h ago" image="S" />
            <MessagePreviewItem name="Chaldal Ltd" time="5h ago" image="C" />
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col min-h-[240px]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Hiring Status</h3>
            <Link to="/applications" className="text-[10px] font-bold text-brand-primary uppercase">All Applications</Link>
          </div>
          <div className="space-y-2">
            <ApplicationSmallItem title="React Assistant" company="ShopUp" status="interviewing" />
            <ApplicationSmallItem title="Academic Assistant" company="Inbound Academy" status="pending" />
            <div className="p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-lg mt-3">
              <p className="text-[10px] text-brand-primary font-bold uppercase mb-1">PRO MATCH BOOST</p>
              <p className="text-[10px] text-gray-400">Highlight your application profile at the top stack of recruiters.</p>
              <button onClick={() => window.location.href='/pricing'} className="w-full mt-2 py-1.5 bg-brand-primary text-white text-[10px] font-semibold rounded-md uppercase tracking-wider hover:bg-brand-secondary transition-all">Get Plus Access</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const ApplicationSmallItem = ({ title, company, status }: { title: string, company: string, status: string }) => (
  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
    <div className="space-y-0.5 truncate max-w-[130px]">
      <p className="text-xs font-semibold text-white truncate">{title}</p>
      <p className="text-[9px] text-gray-500 uppercase tracking-wide truncate">{company}</p>
    </div>
    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider ${
      status === 'interviewing' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
    }`}>
      {status}
    </span>
  </div>
);

const InsightItem = ({ color, text }: { color: string, text: string }) => (
  <li className="flex items-start space-x-2 text-xs">
    <div className={`w-1.5 h-1.5 rounded-full ${color} mt-1.5 shrink-0`}></div>
    <p className="text-gray-400">{text}</p>
  </li>
);

const TrendItem = ({ title, stipend, location }: { title: string, stipend: string, location: string }) => (
  <div className="group cursor-pointer py-1.5 border-b border-white/[0.04] last:border-0 last:pb-0">
    <div className="flex justify-between text-xs mb-0.5">
      <span className="font-semibold text-white group-hover:text-brand-primary transition-colors">{title}</span>
      <span className="text-brand-primary font-semibold font-mono">{stipend}</span>
    </div>
    <p className="text-[10px] text-gray-500 uppercase font-medium">{location}</p>
  </div>
);

const MessagePreviewItem = ({ name, time, image }: { name: string, time: string, image: string }) => (
  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-brand-primary/20 transition-all cursor-pointer">
    <div className="flex items-center space-x-2.5">
      <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center font-bold text-white text-xs">{image}</div>
      <div>
        <p className="text-xs font-semibold text-white leading-none">{name}</p>
        <p className="text-[10px] text-brand-primary/80 mt-1">Connected 👋</p>
      </div>
    </div>
    <span className="text-[9px] text-gray-500 font-semibold uppercase">{time}</span>
  </div>
);

export default Dashboard;
