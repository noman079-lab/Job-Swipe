import React, { useState, useEffect } from "react";
import { 
  Users, UserPlus, Mail, Shield, 
  Trash2, Loader2, ArrowLeft, MoreVertical,
  CheckCircle2, XCircle
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const TeamManagement = () => {
  const navigate = useNavigate();
  const { apiFetch } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("recruiter");
  const [inviting, setInviting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      const res = await apiFetch("/api/company/my-company");
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompanyId(data.company.id);
          const membersRes = await apiFetch(`/api/company/${data.company.id}/members`);
          if (membersRes.ok) {
            setMembers(await membersRes.json());
          }
        }
      }
    } catch (err) {
      toast.error("Failed to load team data");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await apiFetch("/api/company/team/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          memberEmail: inviteEmail,
          role: inviteRole
        })
      });
      if (res.ok) {
        toast.success("Team member added! 🚀");
        setInviteEmail("");
        fetchTeam();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to invite member");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
        <p className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Gathering Team Intel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8 pb-32">
      <div className="flex items-center justify-between">
         <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-2xl text-gray-400 hover:text-white transition-all">
           <ArrowLeft className="w-5 h-5" />
         </button>
         <div className="text-right">
            <h2 className="text-3xl font-black italic tracking-tight uppercase">Team Resource Management_</h2>
            <p className="text-[10px] font-black uppercase text-gray-600 tracking-[0.2em]">Scale your recruitment operations</p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Invite Form */}
        <div className="lg:col-span-4 space-y-6">
           <div className="bg-[#0A0A0A] border border-white/5 rounded-[40px] p-8 space-y-8">
              <div className="flex items-center space-x-3">
                 <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary">
                    <UserPlus className="w-5 h-5" />
                 </div>
                 <h3 className="text-[11px] font-black uppercase text-gray-300 tracking-[0.2em]">Deploy Invitation_</h3>
              </div>
              
              <form onSubmit={handleInvite} className="space-y-6">
                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase text-gray-600 tracking-widest ml-1">Member Email</label>
                    <div className="relative group">
                       <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
                       <input 
                        type="email"
                        placeholder="recruiter@company.com"
                        className="w-full bg-[#0D0D0D] border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-sm font-medium outline-none focus:border-brand-primary transition-all placeholder:text-gray-800"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        required
                       />
                    </div>
                 </div>

                 <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold uppercase text-gray-600 tracking-widest ml-1">Access Level</label>
                    <div className="grid grid-cols-2 gap-2">
                       {["HR", "Recruiter", "Manager"].map(role => (
                         <button 
                            key={role}
                            type="button"
                            onClick={() => setInviteRole(role.toLowerCase())}
                            className={cn(
                                "py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                inviteRole === role.toLowerCase() ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-gray-600 hover:border-white/20"
                            )}
                         >
                            {role}
                         </button>
                       ))}
                    </div>
                 </div>

                 <button 
                    disabled={inviting}
                    className="w-full py-4 bg-brand-primary text-white rounded-[20px] text-[10px] font-black uppercase tracking-widest flex items-center justify-center space-x-3 shadow-xl shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                 >
                    {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                    <span>Issue Invitation</span>
                 </button>
              </form>
           </div>

           <div className="bg-brand-primary/10 border border-brand-primary/20 rounded-[32px] p-8 space-y-4 text-left">
              <div className="flex items-center space-x-2 text-brand-primary">
                 <Shield className="w-4 h-4 fill-current" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Protocol Intel</span>
              </div>
              <p className="text-[10px] text-gray-400 font-medium leading-relaxed italic">
                Only Owners and HR can add new members. Recruiters can manage job listings and message candidates but cannot change company settings.
              </p>
           </div>
        </div>

        {/* Right: Members List */}
        <div className="lg:col-span-8">
           <div className="bg-[#0A0A0A] border border-white/5 rounded-[40px] overflow-hidden">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">Active Personnel_</h3>
                 <span className="text-[10px] font-black italic text-brand-primary">{members.length} Members</span>
              </div>
              
              <div className="overflow-x-auto">
                 <table className="w-full text-left">
                    <thead>
                       <tr className="bg-white/[0.02]">
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-700 tracking-widest">User</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-700 tracking-widest">Role</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-700 tracking-widest">Joined</th>
                          <th className="px-8 py-4 text-[10px] font-black uppercase text-gray-700 tracking-widest text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                       {members.map((member) => (
                         <tr key={member.id} className="hover:bg-white/[0.01] transition-colors">
                            <td className="px-8 py-6">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-fuchsia-600 flex items-center justify-center font-black italic shadow-lg shadow-brand-primary/10">
                                     {member.profile_image_url ? (
                                       <img src={member.profile_image_url} alt={member.name} className="w-full h-full object-cover rounded-xl" />
                                     ) : member.name[0]}
                                  </div>
                                  <div>
                                     <p className="text-xs font-black italic uppercase tracking-tight">{member.name}</p>
                                     <p className="text-[9px] text-gray-600 font-bold tracking-widest">{member.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className={cn(
                                 "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border",
                                 member.role === 'owner' ? "bg-brand-primary/10 border-brand-primary/30 text-brand-primary" : "bg-white/5 border-white/10 text-gray-500"
                               )}>
                                  {member.role}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <p className="text-[10px] font-bold uppercase text-gray-700">{new Date(member.created_at).toLocaleDateString()}</p>
                            </td>
                            <td className="px-8 py-6 text-right">
                               <button className="p-2 text-gray-700 hover:text-rose-500 transition-colors">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default TeamManagement;
