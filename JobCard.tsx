import React from "react";
import { motion } from "motion/react";
import { Zap, MapPin, Calendar, Users, Bookmark, Heart, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface JobCardProps {
  id: string;
  urgent?: boolean;
  title: string;
  employer: string;
  rate: string;
  shifts: string;
  location: string;
  slots: number;
  onApply: (id: string, e: React.MouseEvent) => void;
  onSave: (id: string, e: React.MouseEvent) => void;
  onLike: (id: string, e: React.MouseEvent) => void;
  isApplying: boolean;
  hasApplied?: boolean;
  isSaved?: boolean;
  isActionLoading?: boolean;
  isVerified?: boolean;
  skills?: string[];
  matchPercentage?: number;
  matchingSkills?: string[];
}

export const JobCard = ({ 
  id, urgent, title, employer, rate, shifts, location, slots, 
  onApply, onSave, onLike, isApplying, hasApplied, isSaved, isActionLoading, isVerified,
  skills, matchPercentage, matchingSkills
}: JobCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={() => navigate(`/jobs/${id}`)}
      className={cn(
        "bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col justify-between group cursor-pointer transition-all hover:border-brand-primary/20 hover:shadow-md",
        urgent && "border-rose-500/20 bg-rose-500/[0.02]",
        hasApplied && "border-emerald-500/20 bg-emerald-500/[0.02]"
      )}
    >
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
             {urgent ? (
              <div className="flex items-center space-x-1.5 text-rose-400">
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Urgent</span>
              </div>
            ) : (
              <div className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider">Featured</div>
            )}
          </div>
          {!isEmployer && (
            <div className="flex items-center space-x-0.5">
               <button 
                onClick={(e) => { e.stopPropagation(); onSave(id, e); }} 
                disabled={isActionLoading}
                className={cn(
                  "p-1.5 hover:bg-white/5 rounded-md transition-colors", 
                  isSaved ? "text-brand-primary" : "text-gray-400 hover:text-brand-primary",
                  isActionLoading && "opacity-50"
                )}
               >
                  {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />}
               </button>
               <button 
                onClick={(e) => { e.stopPropagation(); onLike(id, e); }} 
                className="p-1.5 hover:bg-white/5 rounded-md transition-colors text-gray-400 hover:text-rose-500"
               >
                  <Heart className="w-4 h-4" />
               </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="space-y-0.5">
            <h3 className="text-base font-bold tracking-tight text-white group-hover:text-brand-primary transition-colors text-left leading-snug">{title}</h3>
            <div className="flex items-center space-x-1.5">
              <p className="text-xs text-gray-400 font-medium text-left">{employer}</p>
              {isVerified && (
                <div className="bg-brand-primary/10 rounded-full p-0.5" title="Verified Employer">
                   <Zap className="w-2.5 h-2.5 text-brand-primary fill-current" />
                </div>
              )}
            </div>
          </div>
          <div className="text-emerald-400 font-bold text-base shrink-0">{rate}</div>
        </div>

        {skills && skills.length > 0 && (
          <div className="space-y-1.5 pt-3 border-t border-white/[0.04] text-left">
            <div className="flex justify-between items-center text-[9px] font-mono font-bold tracking-wider text-gray-500 uppercase">
              <span>SKILL ALIGNMENT_</span>
              {typeof matchPercentage === "number" && matchPercentage > 0 && (
                <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  {matchPercentage}% Match
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill: string) => {
                const isMatched = matchingSkills?.some(s => s.toLowerCase() === skill.toLowerCase());
                return (
                  <span 
                    key={skill}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide transition-all border",
                      isMatched 
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-sm" 
                        : "bg-white/[0.01] text-gray-500 border-white/[0.04] hover:text-gray-400 hover:bg-white/[0.03]"
                    )}
                  >
                    {skill}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-3 border-t border-white/[0.04]">
          <div className="flex items-center space-x-2.5 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5 text-brand-primary/60" />
            <span className="font-medium text-gray-300">{shifts}</span>
          </div>
          <div className="flex items-center space-x-2.5 text-xs text-gray-400">
            <MapPin className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-400">{location}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 whitespace-nowrap">
          <Users className="w-3.5 h-3.5 text-gray-500" />
          <span>{slots} Open</span>
        </div>
        {!isEmployer && (
          <button 
            disabled={isApplying || hasApplied}
            onClick={(e) => { e.stopPropagation(); onApply(id, e); }}
            className={cn(
              "flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all min-h-[36px]",
              hasApplied ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
              urgent ? "bg-rose-500 hover:bg-rose-600 text-white" : "bg-white/5 text-gray-200 border border-white/10 hover:bg-brand-primary hover:border-brand-primary"
            )}
          >
            {isApplying ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : hasApplied ? "Applied" : "Apply Now"}
          </button>
        )}
        {isEmployer && (
          <div className="flex-1 py-2 bg-white/[0.02] border border-white/5 rounded-lg text-[10px] font-semibold uppercase tracking-wider text-gray-500 text-center">
            Employer View
          </div>
        )}
      </div>
    </motion.div>
  );
};
