import React from "react";
import { motion } from "motion/react";
import { CheckCircle, MessageSquare, Loader2, User } from "lucide-react";
import { cn } from "../../utils/cn";
import { useAuth } from "../../hooks/useAuth";

interface CandidateCardProps {
  id: string;
  name: string;
  level: number;
  trust: string;
  speed: string;
  image: string;
  status: string;
  school: string;
  onMessage: () => void;
  onHire: () => void;
  isActionLoading?: boolean;
  isVerified?: boolean;
  skills?: string[];
  matchPercentage?: number;
  matchingSkills?: string[];
}

export const CandidateCard = ({ 
  id, name, level, trust, speed, image, status, school, onMessage, onHire, isActionLoading, isVerified,
  skills, matchPercentage, matchingSkills
}: CandidateCardProps) => {
  const { user } = useAuth();
  const isEmployer = user?.role === 'employer';

  return (
    <motion.div 
      whileHover={{ y: -2 }}
      className="bg-[#111827] border border-white/[0.06] rounded-xl p-5 flex flex-col items-center text-center space-y-4 relative overflow-hidden transition-all hover:border-brand-primary/20 shadow-sm"
    >
      <div className={cn(
        "absolute top-4 right-4 text-[10px] font-semibold px-2 py-0.5 rounded border",
        status === "Available" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
        status === "Busy" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" : "bg-white/5 text-gray-400 border-white/10"
      )}>
        {status}
      </div>

      <div className="relative pt-2">
        <div className="w-16 h-16 rounded-xl bg-white/[0.04] p-0.5 border border-white/10">
          <div className="w-full h-full rounded-lg bg-bg-dark flex items-center justify-center text-xl font-bold overflow-hidden text-white">
            {image.length > 2 ? <img src={image} alt={name} className="w-full h-full object-cover" /> : image}
          </div>
        </div>
        {isVerified && (
          <div className="absolute -bottom-1 -right-1 bg-emerald-500 p-0.5 rounded-full border-2 border-bg-dark">
            <CheckCircle className="w-3 h-3 text-white fill-emerald-500 stroke-bg-dark" />
          </div>
        )}
      </div>

      <div className="space-y-1 w-full text-center">
        <h4 className="text-base font-bold tracking-tight text-white">{name}</h4>
        <p className="text-brand-primary text-xs font-semibold">{level} XP Rating</p>
        <p className="text-xs text-gray-400 truncate max-w-full font-medium">{school}</p>
      </div>

      {skills && skills.length > 0 && (
        <div className="space-y-1.5 w-full pt-3 border-t border-white/[0.04] text-center">
          <div className="flex justify-between items-center text-[9px] font-mono tracking-wider font-bold text-gray-500 uppercase">
            <span>CORE TALENT SKILLS_</span>
            {typeof matchPercentage === "number" && matchPercentage > 0 && (
              <span className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                {matchPercentage}% Match
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1 justify-center">
            {skills.slice(0, 4).map((skill: string) => {
              const isMatched = matchingSkills?.some(s => s.toLowerCase() === skill.toLowerCase());
              return (
                <span 
                  key={skill}
                  className={cn(
                    "text-[10px] px-2 py-0.5 rounded-md font-medium tracking-wide transition-all border",
                    isMatched 
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/20 shadow-sm" 
                      : "bg-white/[0.01] text-gray-500 border-white/[0.04]"
                  )}
                >
                  {skill}
                </span>
              );
            })}
            {skills.length > 4 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.02] text-gray-500 font-bold border border-white/[0.04]">
                +{skills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 w-full pt-4 border-t border-white/[0.04]">
        <div className="text-left">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mb-0.5">Trust Match</span>
          <span className="text-xs font-semibold text-emerald-400">{trust}</span>
        </div>
        <div className="text-left">
          <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block mb-0.5">Response Time</span>
          <span className="text-xs font-semibold text-amber-400">{speed}</span>
        </div>
      </div>

      <div className="flex w-full gap-2 mt-auto pt-2">
        {isEmployer ? (
          <>
            <button 
              onClick={onHire}
              disabled={isActionLoading}
              className="flex-[2] btn-primary text-xs font-semibold py-2 px-1 flex items-center justify-center min-h-[38px] rounded-lg"
            >
              {isActionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white" /> : "Send Offer"}
            </button>
            <button 
              onClick={onMessage}
              className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center transition-all min-h-[38px]"
            >
              <MessageSquare className="w-4 h-4 text-brand-primary" />
            </button>
          </>
        ) : (
          <button 
            className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-medium text-gray-300 flex items-center justify-center space-x-2 hover:text-white transition-all min-h-[38px]"
          >
            <User className="w-3.5 h-3.5 text-brand-primary" />
            <span>Profile Details</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};
