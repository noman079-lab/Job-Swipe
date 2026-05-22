import { useState } from "react";
import { motion } from "motion/react";
import { 
  Clock, MapPin, CheckCircle, TrendingUp, Calendar, 
  ArrowUpRight, AlertCircle, DollarSign, ListChecks,
  Play, StopCircle
} from "lucide-react";
import { cn } from "../utils/cn";

const ShiftManagement = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [activeShift, setActiveShift] = useState<any>({
    id: "S101",
    title: "Delivery Helper",
    employer: "Foodi BD",
    rate: 350,
    startTime: "4:00 PM",
    endTime: "9:00 PM",
    earned: 0
  });

  return (
    <div className="grid grid-cols-12 gap-6 pb-24">
      
      {/* Active Shift Tracker */}
      <div className="col-span-12 md:col-span-4 space-y-6">
        <div className={cn(
          "bento-card relative overflow-hidden transition-all duration-500",
          isClockedIn ? "border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_30px_rgba(16,185,129,0.1)]" : "border-brand-primary/20"
        )}>
          {isClockedIn && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl animate-pulse"></div>
          )}
          
          <div className="space-y-6">
            <div className="flex justify-between items-start">
              <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Active Session</h3>
              {isClockedIn && (
                <div className="flex items-center space-x-2 text-emerald-400">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                  <span className="text-[10px] font-black uppercase">Recording Time</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black italic tracking-tighter uppercase">{activeShift.title}</h2>
              <p className="text-xs text-brand-primary font-bold uppercase tracking-widest">{activeShift.employer}</p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500 italic">Rate</span>
                <span className="text-sm font-black italic">৳{activeShift.rate}/hr</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[10px] uppercase font-bold text-gray-500 italic">Schedule</span>
                <span className="text-sm font-black text-gray-300">{activeShift.startTime} - {activeShift.endTime}</span>
              </div>
              {isClockedIn && (
                <div className="flex justify-between items-end pt-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 italic block mb-1">Estimated Earnings</span>
                    <span className="text-4xl font-black italic text-emerald-400">৳780</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-gray-500 italic block mb-1">Time Elapsed</span>
                    <span className="text-xl font-mono font-bold">02:14:45</span>
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsClockedIn(!isClockedIn)}
              className={cn(
                "w-full py-4 rounded-2xl flex items-center justify-center space-x-3 transition-all font-black uppercase tracking-widest shadow-xl",
                isClockedIn ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-emerald-500 text-white shadow-emerald-500/20"
              )}
            >
              {isClockedIn ? (
                <>
                  <StopCircle className="w-5 h-5" />
                  <span>Clock Out</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>Clock In Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="bento-card space-y-6">
           <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-widest">Attendance Goals</h3>
           <div className="grid grid-cols-2 gap-4">
              <GoalCard label="Punctuality" value="98%" trend="+2%" />
              <GoalCard label="Reliability" value="High" trend="Elite" />
           </div>
        </div>
      </div>

      {/* Earnings & History */}
      <div className="col-span-12 md:col-span-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatWidget label="This Week" value="৳4,250" sub="12 Hours" icon={<DollarSign className="w-4 h-4" />} />
          <StatWidget label="Messages" value="14" sub="Last 7 Days" icon={<CheckCircle className="w-4 h-4" />} />
          <StatWidget label="Avg Rate" value="৳320" sub="Higher than 80%" icon={<TrendingUp className="w-4 h-4" />} />
        </div>

        <div className="bento-card min-h-[400px] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase text-gray-500 tracking-widest flex items-center space-x-2">
              <ListChecks className="w-4 h-4" />
              <span>Shift History</span>
            </h3>
            <button className="text-[10px] font-bold uppercase text-brand-primary hover:underline">View All</button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-bold uppercase text-gray-500">
                  <th className="px-6 py-4">Job / Employer</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Hours</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Earning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <ShiftRow 
                  title="Event Helper" employer="Pathao" date="May 12" 
                  hours="4.5" status="Verified" amount="1,575" 
                />
                <ShiftRow 
                  title="Tutor Session" employer="Private" date="May 11" 
                  hours="2.0" status="Verified" amount="1,200" 
                />
                <ShiftRow 
                  title="Flyer Dist." employer="Burger King" date="May 10" 
                  hours="6.0" status="Pending" amount="1,800" 
                />
                <ShiftRow 
                  title="Delivery Ops" employer="Chaldal" date="May 08" 
                  hours="4.0" status="Verified" amount="1,400" 
                />
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
};

const StatWidget = ({ label, value, sub, icon }: any) => (
  <div className="bento-card border-white/5 bg-white/[0.02] flex flex-col justify-between h-32">
    <div className="flex justify-between items-start">
      <span className="text-[10px] font-bold uppercase text-gray-500">{label}</span>
      <div className="text-brand-primary p-1">{icon}</div>
    </div>
    <div>
      <p className="text-2xl font-black italic">{value}</p>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sub}</p>
    </div>
  </div>
);

const GoalCard = ({ label, value, trend }: any) => (
  <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
    <span className="text-[10px] font-bold uppercase text-gray-500 block mb-1">{label}</span>
    <span className="text-xl font-black italic block leading-none mb-1">{value}</span>
    <span className="text-[10px] font-bold uppercase text-emerald-400">{trend}</span>
  </div>
);

const ShiftRow = ({ title, employer, date, hours, status, amount }: any) => (
  <tr className="group hover:bg-white/[0.02] transition-colors cursor-default">
    <td className="px-6 py-4">
      <p className="text-sm font-bold tracking-tight">{title}</p>
      <p className="text-[10px] text-gray-500 font-bold uppercase">{employer}</p>
    </td>
    <td className="px-6 py-4 text-xs font-medium text-gray-400">{date}</td>
    <td className="px-6 py-4 text-xs font-mono">{hours}h</td>
    <td className="px-6 py-4">
      <span className={cn(
        "text-[10px] font-bold uppercase px-2 py-1 rounded",
        status === "Verified" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
      )}>
        {status}
      </span>
    </td>
    <td className="px-6 py-4 text-right font-black italic text-brand-primary">৳{amount}</td>
  </tr>
);

export default ShiftManagement;
