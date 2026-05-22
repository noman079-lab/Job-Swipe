import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Users, Briefcase, TrendingUp, MessageSquare, Clock, ArrowUpRight, Loader2, Zap, Building2, DollarSign, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

const EngagementCard = ({ engagement }: { engagement: any }) => {
    const isDeployment = engagement.type === 'deployment';
    const navigate = useNavigate();
    return (
        <Link to={`/messages/${engagement.conversation_id}`} className="p-4 rounded-xl bg-[#111827] border border-white/[0.06] hover:border-brand-primary/20 transition-all group flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0">
                        {engagement.partner_image ? (
                            <img src={engagement.partner_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center font-bold text-brand-primary text-xs">
                                {engagement.partner_name?.[0]}
                            </div>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-white group-hover:text-brand-primary transition-colors">{engagement.partner_name}</p>
                        <p className="text-[10px] text-gray-400 font-medium">{isDeployment ? 'Direct Hire' : 'Premium Offer'}</p>
                    </div>
                </div>
                <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] uppercase font-semibold border",
                    engagement.status === 'confirmed' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-brand-primary/10 border-brand-primary/20 text-brand-primary"
                )}>
                    {engagement.status}
                </div>
            </div>
            
            <div className="flex justify-between items-end mt-2">
                <div className="space-y-0.5">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Salary Offer</p>
                    <p className="text-base font-bold text-white">৳{engagement.data}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-brand-primary transition-all" />
            </div>
        </Link>
    );
};

const EmployerDashboard = () => {
  const { apiFetch, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await apiFetch("/api/employer/dashboard");
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-xs font-semibold text-gray-400">Loading Dashboard Information...</p>
      </div>
    );
  }

  const { stats, activeJobs, recentChats, activeEngagements } = data || { stats: {}, activeJobs: [], recentChats: [], activeEngagements: [] };

  return (
    <div className="pb-24 px-4 max-w-7xl mx-auto mt-6 space-y-6">
      
      {/* Company Brand Header */}
      <div className="relative h-48 rounded-2xl overflow-hidden group">
         {(data?.company?.banner_url) ? (
           <img src={data.company.banner_url} alt="Banner" className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full bg-gradient-to-r from-bg-dark via-[#111827] to-bg-dark border-b border-white/[0.04]" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-bg-dark via-transparent to-transparent" />
         
         <div className="absolute bottom-6 left-6 flex items-center space-x-4">
            <div className="w-16 h-16 rounded-xl bg-card-bg border border-white/[0.08] shadow-lg p-0.5 overflow-hidden">
               {data?.company?.logo_url ? (
                 <img src={data.company.logo_url} alt="Logo" className="w-full h-full object-contain" />
               ) : (
                 <div className="w-full h-full bg-brand-primary/10 flex items-center justify-center text-xl font-bold text-brand-primary">
                    {data?.company?.name?.[0] || user?.name?.[0]}
                 </div>
               )}
            </div>
            <div className="space-y-0.5">
               <h2 className="text-2xl font-bold text-white tracking-tight">
                  {data?.company?.name || user?.name || "Corporate Workspace"}
               </h2>
               <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-400 font-medium">{data?.company?.industry || "Industry Not specified"}</span>
                  <span className="text-gray-700">•</span>
                  <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold border uppercase",
                    data?.company?.verification_status === 'verified' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                  )}>
                    {data?.company?.verification_status || 'unverified'}
                  </div>
               </div>
            </div>
         </div>

         <Link to="/employer/profile/edit" className="absolute top-6 right-6 p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all">
            <Building2 className="w-4 h-4" />
         </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        
        {/* Quick Action Navigation */}
        <div className="col-span-12 flex overflow-x-auto no-scrollbar whitespace-nowrap gap-3 pb-1">
           {[
             { label: "Configure Profile", icon: <Building2 className="w-3.5 h-3.5" />, link: "/employer/profile/edit" },
             { label: "Team Members", icon: <Users className="w-3.5 h-3.5" />, link: "/employer/team" },
             { label: "Plans & Billing", icon: <DollarSign className="w-3.5 h-3.5" />, link: "/pricing" },
             { label: "Verification Status", icon: <ShieldCheck className="w-3.5 h-3.5" />, link: "/employer/profile/edit" },
           ].map((act, i) => (
             <Link key={i} to={act.link} className="px-4 py-2 bg-[#111827] border border-white/[0.06] rounded-lg flex items-center space-x-2 text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 transition-all min-w-fit">
                {act.icon}
                <span>{act.label}</span>
             </Link>
           ))}
        </div>

        {/* Left Side stats & listings (span 4) */}
        <div className="col-span-12 lg:col-span-4 space-y-6 text-left">
          
          {/* Trust Scoring Card */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Verification Audit</h3>
                <ShieldCheck className="w-4 h-4 text-brand-primary" />
             </div>
             <div className="space-y-3">
                <div className="flex justify-between items-end">
                   <div>
                      <div className="text-3xl font-bold text-white tracking-tight">{data?.company?.trust_score || 0}%</div>
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Company Trust Index</div>
                   </div>
                   <div className="text-right">
                      <div className="text-[10px] font-bold text-brand-primary uppercase tracking-wider mb-1">
                        {data?.company?.verification_status === 'verified' ? "Verified Account" : "Action Needed"}
                      </div>
                      <div className="flex space-x-0.5 justify-end">
                         {[1,2,3,4,5].map(i => (
                           <div key={i} className={cn(
                             "w-1 h-2 rounded-full",
                             (i <= (data?.company?.trust_score || 0) / 20) ? "bg-brand-primary" : "bg-white/5"
                           )} />
                         ))}
                      </div>
                   </div>
                </div>
                
                <p className="text-xs text-gray-400 leading-relaxed">
                   {data?.company?.verification_status === 'verified' 
                    ? "Your account verification is active. Premium applicant streams unlocked."
                    : "Complete your basic company profile fields to verify your organization."}
                </p>

                {data?.company?.verification_status !== 'verified' && (
                  <Link to="/employer/profile/edit" className="flex items-center justify-center space-x-2 w-full py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-lg text-xs font-semibold text-brand-primary hover:bg-brand-primary/20 transition-all">
                    <span>Verify Profile Now</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                )}
             </div>
          </div>

          {/* Core Analytics Figures */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5">
             <div className="text-left mb-4">
               <h3 className="text-xs font-bold text-white uppercase tracking-wider">Hiring Statistics</h3>
             </div>
             <div className="grid grid-cols-2 gap-3">
               <div className="text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                 <p className="text-xl font-bold text-white">{stats?.total_applicants || 0}</p>
                 <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Applicants</p>
               </div>
               <div className="text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                 <p className="text-xl font-bold text-brand-primary">{stats?.pending_deployments || 0}</p>
                 <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Instant Hires</p>
               </div>
               <div className="text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                 <p className="text-xl font-bold text-amber-500">{stats?.pending_proposals || 0}</p>
                 <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Offers Sent</p>
               </div>
               <div className="text-left p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                 <p className="text-xl font-bold text-emerald-400">{stats?.pending_interviews || 0}</p>
                 <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Interviews</p>
               </div>
             </div>
          </div>

          {/* Active Job Postings */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 space-y-4">
             <div className="flex items-center justify-between">
               <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Postings</h3>
               <span className="text-xs font-semibold text-brand-primary">{activeJobs.length} Live</span>
             </div>
             <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1">
               {activeJobs.map((job: any) => (
                 <ActivePost key={job.id} id={job.id} title={job.title} applicants={job.applicants_count} matches={job.matches_count} />
               ))}
               {activeJobs.length === 0 && (
                  <div className="py-8 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center px-4">
                     <p className="text-gray-500 text-xs text-center">No active listings posted yet.</p>
                  </div>
               )}
             </div>
             <Link to="/create-job" className="w-full py-2 bg-brand-primary hover:bg-brand-secondary text-white flex items-center justify-center space-x-2 rounded-lg text-xs font-semibold transition-all shadow-sm">
               <Plus className="w-3.5 h-3.5" />
               <span>Create New Post</span>
             </Link>
          </div>

        </div>

        {/* Right Side Main details & comms (span 8) */}
        <div className="col-span-12 lg:col-span-8 space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Find Candidates Block */}
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 flex flex-col justify-between group cursor-pointer hover:bg-[#161f30] transition-all relative overflow-hidden">
              <Link to="/marketplace?tab=workers" className="space-y-4 flex flex-col h-full">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-brand-primary/10 border border-brand-primary/20 rounded-lg flex items-center justify-center text-brand-primary group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-500 group-hover:text-brand-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white tracking-tight">Talents Directory</h3>
                  <p className="text-xs text-gray-400 font-normal leading-relaxed">Search, screen, and swipe through qualified university students and graduates.</p>
                </div>
                <div className="pt-2 mt-auto">
                  <span className="text-brand-primary text-xs font-semibold border-b border-brand-primary/30 pb-0.5 group-hover:border-brand-primary transition-colors">Browse Candidates</span>
                </div>
              </Link>
            </div>

            {/* Inbound Signals (Messages) */}
            <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 flex flex-col space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Candidate Direct Messages</h3>
                  <div className="flex items-center space-x-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                     <span className="text-[10px] font-semibold text-emerald-400 uppercase">Live</span>
                  </div>
               </div>
               <div className="space-y-3 overflow-y-auto max-h-[160px] pr-1">
                  {recentChats.map((chat: any) => (
                    <ChatPreview 
                      key={chat.id}
                      id={chat.id}
                      name={chat.other_user_name} 
                      role={chat.other_user_uni || chat.other_user_role} 
                      time={new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
                      message={chat.last_message}
                    />
                  ))}
                  {recentChats.length === 0 && (
                     <div className="py-10 flex flex-col items-center justify-center space-y-2 opacity-50">
                        <MessageSquare className="w-8 h-8 text-gray-500" />
                        <p className="text-xs text-gray-400">No recent messages.</p>
                     </div>
                  )}
               </div>
               <Link to="/messages" className="w-full py-2 text-center text-xs font-semibold bg-white/5 border border-white/10 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all">Open Messages</Link>
            </div>
          </div>

          {/* Active Hiring Protocols */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 space-y-4">
             <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity</h3>
                  <h4 className="text-lg font-bold text-white tracking-tight">Active Offers</h4>
                </div>
                <div className="px-3 py-1 bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-xs font-semibold rounded-lg">{activeEngagements.length} Sent</div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeEngagements.map((eng: any) => (
                  <EngagementCard key={`${eng.type}-${eng.id}`} engagement={eng} />
                ))}
                {activeEngagements.length === 0 && (
                  <div className="col-span-2 py-10 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center space-y-2 opacity-40">
                      <Zap className="w-8 h-8 text-gray-500" />
                      <p className="text-xs text-gray-400">No pending placements or active offers.</p>
                  </div>
                )}
             </div>
          </div>

          {/* Bottom Insights Banner */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-left">
              <div className="flex items-center space-x-1.5 text-brand-primary">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Talent Match Suggestions</span>
              </div>
              <p className="text-xs text-gray-300 font-medium">
                "Your job designs are highly compatible with DU CS graduates. Update your profile coordinates to maximize matching output."
              </p>
            </div>
            <button className="whitespace-nowrap px-4 py-2 bg-brand-primary hover:bg-brand-secondary text-white rounded-lg text-xs font-semibold transition-all shadow-sm">
              Update Info
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

const ActivePost = ({ id, title, applicants, matches }: { id: string, title: string, applicants: number, matches: number }) => (
  <Link to={`/employer/jobs/${id}/applicants`} className="block group pb-3 border-b border-white/[0.04] last:border-0 last:pb-0">
    <div className="flex justify-between items-center text-xs">
      <div className="space-y-0.5">
        <span className="font-semibold text-white group-hover:text-brand-primary transition-colors block text-sm">{title}</span>
        <div className="flex space-x-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
           <span>Updated Today</span>
           <span>•</span>
           <span className="text-emerald-500">Active</span>
        </div>
      </div>
      <div className="flex space-x-3 text-[10px] font-semibold uppercase bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.04]">
        <div className="flex flex-col items-center">
           <span className="text-white text-xs">{applicants}</span>
           <span className="text-gray-500 text-[9px]">Applicants</span>
        </div>
        <div className="w-px h-5 bg-white/10" />
        <div className="flex flex-col items-center">
           <span className="text-brand-primary text-xs">{matches}</span>
           <span className="text-gray-500 text-[9px]">Matches</span>
        </div>
      </div>
    </div>
  </Link>
);

const ChatPreview = ({ id, name, role, time, message }: { id: string, name: string, role: string, time: string, message: string }) => (
  <Link to={`/messages?conversation=${id}`} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-brand-primary/20 hover:bg-white/[0.04] transition-all group">
    <div className="flex items-center space-x-3 min-w-0">
      <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center font-bold text-white text-sm flex-shrink-0">
        {name[0]}
      </div>
      <div className="min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-xs font-semibold text-white truncate">{name}</p>
          <span className="text-[10px] text-gray-500">{time}</span>
        </div>
        <p className="text-[11px] text-gray-400 truncate max-w-[200px]">"{message}"</p>
      </div>
    </div>
    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
  </Link>
);

export default EmployerDashboard;
