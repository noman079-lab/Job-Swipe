import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Building2, Globe, MapPin, Users, Calendar, 
  Linkedin, Twitter, Facebook, ExternalLink,
  ShieldCheck, Briefcase, Star, Loader2, ArrowLeft,
  ChevronRight, TrendingUp, Zap
} from "lucide-react";
import { motion } from "motion/react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

const PublicCompanyProfile = () => {
  const { id } = useParams();
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await apiFetch(`/api/company/${id}`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
        <p className="text-xs font-semibold text-gray-500">Querying organization archives...</p>
      </div>
    );
  }

  if (!data?.company) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Building2 className="w-16 h-16 text-gray-700" />
        <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Company Profile Not Found</h2>
            <p className="text-xs text-gray-500">The requested employer profile does not exist in our corporate directories.</p>
        </div>
        <Link to="/marketplace" className="btn-primary px-5 py-2 text-xs font-semibold">Back to Marketplace</Link>
      </div>
    );
  }

  const { company, jobs } = data;
  const socialLinks = typeof company.social_links === 'string' ? JSON.parse(company.social_links) : company.social_links || {};

  return (
    <div className="pb-24 text-left">
      {/* Header / Banner */}
      <div className="relative h-64 w-full overflow-hidden bg-[#111827] border-b border-white/[0.04] mb-8">
         {company.banner_url ? (
           <img src={company.banner_url} alt={company.name} className="w-full h-full object-cover" />
         ) : (
           <div className="w-full h-full bg-gradient-to-br from-indigo-950/20 to-brand-primary/10 opacity-70" />
         )}
         <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F14] via-[#0B0F14]/60 to-transparent" />
         
          <div className="absolute bottom-6 left-0 right-0 max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-end gap-6">
            <div className="w-24 h-24 rounded-xl bg-[#111827] border border-white/10 p-2 overflow-hidden shadow-xl shrink-0 flex items-center justify-center">
               {company.logo_url ? (
                 <img src={company.logo_url} alt="logo" className="w-full h-full object-contain rounded" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center bg-brand-primary/10 text-brand-primary font-bold text-3xl">
                   {company.name?.[0] || 'C'}
                 </div>
               )}
            </div>
            
            <div className="flex-1 space-y-2 text-center md:text-left mb-1">
               <div className="flex items-center justify-center md:justify-start space-x-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white leading-none">{company.name}</h1>
                  {company.verification_status === 'verified' && (
                    <div className="bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-full p-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                  )}
               </div>
               
               <div className="flex flex-wrap justify-center md:justify-start gap-4 text-xs font-semibold text-gray-400">
                  <div className="flex items-center space-x-1.5">
                     <Building2 className="w-4 h-4 text-gray-500" />
                     <span>{company.industry || "General Industry"}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                     <MapPin className="w-4 h-4 text-gray-500" />
                     <span>{company.location || "Bangladesh"}</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400 bg-emerald-500/5 px-2.5 py-0.5 rounded border border-emerald-500/10">
                     <Zap className="w-3.5 h-3.5 fill-current" />
                     <span>Actively Hiring</span>
                  </div>
               </div>
            </div>

            <div className="flex space-x-2 shrink-0 md:mb-1">
               {socialLinks.linkedin && (
                 <a href={socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                   <Linkedin className="w-4 h-4" />
                 </a>
               )}
               {socialLinks.twitter && (
                 <a href={socialLinks.twitter} target="_blank" rel="noreferrer" className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-all">
                   <Twitter className="w-4 h-4" />
                 </a>
               )}
               <a href={company.website || "#"} target="_blank" rel="noreferrer" className="px-4 py-2 bg-brand-primary text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 hover:bg-opacity-90 transition-all">
                 <span>Visit Website</span>
                 <ExternalLink className="w-3.5 h-3.5" />
               </a>
            </div>
          </div>
       </div>

       <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
          {/* About Section */}
          <div className="lg:col-span-4 space-y-6 text-left">
             <div className="space-y-2 text-left">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">About Company</h3>
                <p className="text-gray-300 text-sm leading-relaxed leading-relaxed">
                  {company.description || "Building the next generation of solution models with a unified focus on candidate excellence and educational integrity."}
                </p>
             </div>

             <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 space-y-5 text-left">
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Company Metadata</h3>
                <div className="space-y-3">
                   <StatItem icon={<Calendar className="w-4 h-4" />} label="Established" value={company.founded_year || "EST 2024"} />
                   <StatItem icon={<Users className="w-4 h-4" />} label="Team Size" value={company.size || "1-10 Employees"} />
                   <StatItem icon={<TrendingUp className="w-4 h-4" />} label="Trust Score" value={`${company.trust_score || 85}% Verification`} />
                </div>
             </div>

             <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 space-y-4 text-left">
                <div className="flex items-center justify-between">
                     <h3 className="text-brand-primary text-xs font-bold uppercase tracking-wider">Hiring Statistics</h3>
                     <TrendingUp className="w-4 h-4 text-brand-primary" />
                </div>
                <div className="space-y-3">
                     <div className="flex items-center justify-between text-xs font-semibold">
                         <span className="text-gray-400">Response Rate</span>
                         <span className="text-gray-200">Rapid (~2 hours)</span>
                     </div>
                     <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                         <div className="w-4/5 h-full bg-brand-primary rounded-full" />
                     </div>
                     <p className="text-[11px] text-gray-500 font-medium leading-relaxed font-sans">
                         High conversion metrics for verified computer science and technology student applicants.
                     </p>
                </div>
             </div>
          </div>

          {/* Active Jobs Section */}
          <div className="lg:col-span-8 space-y-6 text-left">
             <div className="flex items-center justify-between">
                <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider">Active Openings</h3>
                <div className="flex items-center space-x-2 text-xs font-semibold text-brand-primary">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span>{jobs.length} Job Deployments</span>
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {jobs.map((job: any) => (
                  <Link key={job.id} to={`/jobs/${job.id}`} className="group block text-left">
                     <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 hover:border-brand-primary/20 transition-all flex flex-col justify-between h-56 text-left">
                        <div className="space-y-3 text-left">
                           <div className="flex justify-between items-center text-left">
                              <span className={cn(
                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                job.type === 'internship' ? "bg-fuchsia-500/10 border-fuchsia-500/20 text-fuchsia-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                              )}>
                                 {job.type}
                              </span>
                              <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-white transition-colors" />
                           </div>
                           <h4 className="text-base font-bold text-white group-hover:text-brand-primary transition-colors line-clamp-2 leading-snug">{job.title}</h4>
                           <div className="flex items-center space-x-3 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                              <span className="flex items-center space-x-1"><MapPin className="w-3.5 h-3.5 text-gray-500" /> &middot; <span>{job.location}</span></span>
                              <span>&middot;</span>
                              <span>{job.category}</span>
                           </div>
                        </div>
                        
                        <div className="pt-3 border-t border-white/[0.04] flex items-center justify-between text-left">
                           <p className="text-xs font-bold text-white uppercase tracking-tight">{job.budget}</p>
                           <span className="text-[10px] font-bold uppercase text-brand-primary bg-brand-primary/10 px-2.5 py-1 rounded">View Details</span>
                        </div>
                     </div>
                  </Link>
                ))}
                {jobs.length === 0 && (
                  <div className="col-span-full py-16 border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center space-y-3 bg-white/[0.005]">
                     <Briefcase className="w-8 h-8 text-gray-500" />
                     <div className="space-y-1 text-center">
                        <p className="text-sm font-semibold text-gray-400">Passive Recruitment phase</p>
                        <p className="text-xs text-gray-500">This employer is not actively hosting new directories currently.</p>
                     </div>
                  </div>
                )}
             </div>
          </div>
       </div>
    </div>
  );
};

const StatItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center justify-between p-3 bg-white/[0.01] rounded-lg border border-white/[0.04] text-xs">
     <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-gray-400">
        {icon}
        <span>{label}</span>
     </div>
     <span className="font-semibold text-white">{value}</span>
  </div>
);

export default PublicCompanyProfile;
