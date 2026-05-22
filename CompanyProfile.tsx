import React, { useState, useEffect } from "react";
import { 
  Building, Globe, Linkedin, MapPin, Briefcase, 
  ShieldCheck, Upload, Save, Settings, Plus,
  Trash2, ExternalLink, Loader2, Camera, MoreVertical,
  CheckCircle2, AlertCircle, Info, Clock, Zap, User, Users,
  Mail, Link
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";

interface CompanyProfileProps {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
}

const CompanyProfile = ({ isEditing, setIsEditing }: CompanyProfileProps) => {
  const { user, apiFetch, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [jobs, setJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [formData, setFormData] = useState({
    companyName: "",
    industry: "",
    website: "",
    linkedin: "",
    recruiterName: "",
    bio: "",
    location: "",
    profile_image_url: "",
    verification_status: "unverified"
  });

  useEffect(() => {
    if (user) {
      setFormData({
        companyName: user.company_name || "",
        industry: user.company_industry || "",
        website: user.company_website || "",
        linkedin: user.company_linkedin || "",
        recruiterName: user.recruiter_name || user.name || "",
        bio: user.bio || "",
        location: user.location || "",
        profile_image_url: user.profile_image_url || "",
        verification_status: user.verification_status || "unverified"
      });
      fetchCompanyJobs();
    }
  }, [user]);

  const fetchCompanyJobs = async () => {
    setLoadingJobs(true);
    try {
      const res = await apiFetch("/api/employer/jobs");
      if (res.ok) {
        setJobs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.id,
          company_name: formData.companyName,
          company_industry: formData.industry,
          company_website: formData.website,
          company_linkedin: formData.linkedin,
          recruiter_name: formData.recruiterName,
          bio: formData.bio,
          location: formData.location
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success("Organization details updated successfully!");
        setIsEditing(false);
        await refreshUser();
      } else {
        toast.error(data.error || "Failed to update profile");
      }
    } catch (err) {
      toast.error("Network communication error");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await apiFetch("/api/upload/profile-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user?.id, imageData: base64 })
        });
        const data = await res.json();
        if (data.success) {
          setFormData(prev => ({ ...prev, profile_image_url: data.imageUrl }));
          toast.success("Company logo updated!");
          await refreshUser();
        }
      } catch (err) {
        toast.error("Logo upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const isVerified = formData.verification_status === 'verified';

  return (
    <div className="grid grid-cols-12 gap-6 text-left">
      {/* Sidebar: Company Identity */}
      <div className="col-span-12 lg:col-span-4 space-y-6">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 flex flex-col items-center text-center space-y-5 relative overflow-hidden">
          <div className="relative group">
            <div className="w-28 h-28 rounded-lg border border-white/10 p-2 bg-white/[0.02] flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={formData.profile_image_url || `https://api.dicebear.com/7.x/initials/svg?seed=${formData.companyName}`} 
                className="w-full h-full object-contain rounded" 
                alt="Company Logo"
              />
            </div>

            {isVerified && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1 border border-black shadow">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
            )}
          </div>

          <div className="space-y-1.5 w-full">
            <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
              {formData.companyName || "Organization Unnamed"}
            </h2>
            <div className="flex items-center justify-center space-x-2 text-xs font-medium text-gray-400">
              <span>{formData.industry || "Industry Unspecified"}</span>
              <span className="text-gray-600">&middot;</span>
              <span>{formData.location || "Global Coordinates"}</span>
            </div>
          </div>

          <div className="w-full h-px bg-white/[0.04]" />

          <div className="w-full space-y-2">
            <a href={formData.website} target="_blank" rel="noreferrer" className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-white/[0.02] border border-transparent transition-all group">
              <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand-primary transition-colors">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-0.5">Website</p>
                <p className="text-xs font-semibold text-gray-300 truncate">{formData.website || "Not Linked"}</p>
              </div>
              {formData.website && <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />}
            </a>

            <a href={formData.linkedin} target="_blank" rel="noreferrer" className="flex items-center space-x-3 p-2.5 rounded-lg hover:bg-white/[0.02] border border-transparent transition-all group">
              <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-brand-primary transition-colors">
                <Linkedin className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-0.5">LinkedIn Profile</p>
                <p className="text-xs font-semibold text-gray-300 truncate">{formData.linkedin || "Not Linked"}</p>
              </div>
              {formData.linkedin && <ExternalLink className="w-3.5 h-3.5 text-gray-500 group-hover:text-white" />}
            </a>
          </div>

          <div className="w-full pt-1">
             <button 
               onClick={() => setIsEditing(!isEditing)}
               className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-all flex items-center justify-center space-x-1.5"
             >
               <Settings className="w-4 h-4" />
               <span>Organization Console</span>
             </button>
          </div>
        </div>

        {/* Verification Status */}
        <div className={cn(
          "bg-[#111827] border rounded-xl p-4 space-y-3 relative overflow-hidden text-left",
          isVerified ? "border-emerald-500/10 bg-emerald-500/[0.01]" : "border-amber-500/10 bg-amber-500/[0.01]"
        )}>
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Employer Badge Audit</h4>
            <div className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
              isVerified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
            )}>
              {formData.verification_status}
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className={cn("p-2 rounded-lg border shrink-0", isVerified ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10")}>
                {isVerified ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-gray-500" />}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-white">Trust Vetting Standard</p>
                <p className="text-[10px] text-gray-500 font-medium">Verified organizations can post instantly.</p>
              </div>
            </div>

            {!isVerified && (
              <button 
                onClick={() => setActiveTab('verification')}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 rounded-lg text-xs font-semibold text-amber-400 transition-all"
              >
                Request Vetting Review
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="col-span-12 lg:col-span-8 space-y-6">
        {/* Core Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-[#111827] border border-white/[0.06] rounded-xl text-left space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Active Postings</p>
            <h4 className="text-2xl font-bold text-white">{jobs.length}</h4>
          </div>
          <div className="p-4 bg-[#111827] border border-white/[0.06] rounded-xl text-left space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Recruiter Applications</p>
            <h4 className="text-2xl font-bold text-white">{jobs.reduce((acc, j) => acc + (j.applications_count || 0), 0)}</h4>
          </div>
          <div className="p-4 bg-[#111827] border border-white/[0.06] rounded-xl text-left space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 font-mono">Employer Score</p>
            <h4 className="text-2xl font-bold text-white">A+ Level</h4>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/[0.06] rounded-xl flex flex-col min-h-[500px] overflow-hidden p-6 text-left">
          <div className="flex border-b border-white/[0.04] space-x-6 mb-6 shrink-0">
            <button 
              onClick={() => setActiveTab('overview')} 
              className={cn("py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-left", activeTab === 'overview' ? "border-brand-primary text-white" : "border-transparent text-gray-500 hover:text-white")}
            >
              Enterprise Profile
            </button>
            <button 
              onClick={() => setActiveTab('jobs')} 
              className={cn("py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-left", activeTab === 'jobs' ? "border-brand-primary text-white" : "border-transparent text-gray-500 hover:text-white")}
            >
              Listed Roles ({jobs.length})
            </button>
            <button 
              onClick={() => setActiveTab('verification')} 
              className={cn("py-3 text-xs font-bold uppercase tracking-wider border-b-2 text-left", activeTab === 'verification' ? "border-brand-primary text-white" : "border-transparent text-gray-500 hover:text-white")}
            >
              Trust Protocol
            </button>
          </div>

          <div className="flex-1 text-left">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">About Organization</h3>
                  <div className="p-4 rounded-lg bg-white/[0.01] border border-white/[0.04] min-h-[140px]">
                    <p className="text-gray-300 text-xs leading-relaxed">
                      {formData.bio || "No summary has been transmitted for this organization yet. Initialize edit mode/profile settings to fill background parameters."}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                   <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Key Details</h3>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#111827] border border-white/[0.04]">
                         <User className="w-4 h-4 text-brand-primary shrink-0" />
                         <div className="text-left">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Main Recruiter</p>
                           <p className="text-xs font-semibold text-gray-200">{formData.recruiterName || "Not set"}</p>
                         </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#111827] border border-white/[0.04]">
                         <Building className="w-4 h-4 text-brand-primary shrink-0" />
                         <div className="text-left">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Industry Vertical</p>
                           <p className="text-xs font-semibold text-gray-200">{formData.industry || "Not set"}</p>
                         </div>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-lg bg-[#111827] border border-white/[0.04]">
                         <MapPin className="w-4 h-4 text-brand-primary shrink-0" />
                         <div className="text-left">
                           <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Base Office</p>
                           <p className="text-xs font-semibold text-gray-200">{formData.location || "Not set"}</p>
                         </div>
                      </div>
                   </div>
                </div>

                {isEditing && (
                  <div className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg space-y-4 pt-4 mt-6">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Update Profile Information</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company Name</label>
                        <input 
                          type="text" 
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Recruiter Name</label>
                        <input 
                          type="text" 
                          value={formData.recruiterName}
                          onChange={(e) => setFormData({ ...formData, recruiterName: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Industry</label>
                        <input 
                          type="text" 
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Location</label>
                        <input 
                          type="text" 
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Website URL</label>
                        <input 
                          type="text" 
                          value={formData.website}
                          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">LinkedIn URL</label>
                        <input 
                          type="text" 
                          value={formData.linkedin}
                          onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Company Bio</label>
                      <textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                        className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none h-24 resize-none leading-relaxed"
                      />
                    </div>

                    <button 
                      onClick={handleSave} 
                      disabled={loading}
                      className="btn-primary w-full py-2.5 text-xs font-semibold flex items-center justify-center space-x-1"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                      <span>Save Organization Parameters</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Directives</h3>
                </div>

                {loadingJobs ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
                ) : jobs.length === 0 ? (
                  <div className="py-12 text-center border border-dashed border-white/10 rounded-lg">
                      <Briefcase className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">No company jobs have been listed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map(job => (
                      <div key={job.id} className="p-4 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between group hover:border-brand-primary/20 transition-all">
                        <div className="flex items-center space-x-3.5 text-left">
                          <div className="w-9 h-9 rounded bg-brand-primary/10 flex items-center justify-center text-brand-primary shrink-0">
                            <Zap className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-xs text-white group-hover:text-brand-primary transition-colors leading-snug">{job.title}</h4>
                            <div className="flex items-center space-x-2 text-[10px] text-gray-500 font-semibold uppercase mt-0.5">
                              <span>{job.type}</span>
                              <span>&middot;</span>
                              <span>{job.applications_count || 0} Applicants</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'verification' && (
              <div className="space-y-6 max-w-md mx-auto py-6 text-left">
                <div className="text-center space-y-3 mb-6">
                  <div className="w-14 h-14 bg-brand-primary/10 border border-brand-primary/15 rounded-full flex items-center justify-center mx-auto">
                    <ShieldCheck className="w-7 h-7 text-brand-primary" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-white">Trust and Safety Clearance</h3>
                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider leading-relaxed">Establish organization credibility for recruitment priority.</p>
                  </div>
                </div>

                <div className="space-y-3 text-left">
                  <div className="w-full p-4 rounded-lg border bg-white/[0.01] border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-semibold text-white">Corporate Domain Vetting</h4>
                        <p className="text-[10px] text-gray-500">Confirm OTP link sent to official website email accounts.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded">
                      {isVerified ? "Success" : "Pending"}
                    </span>
                  </div>

                  <div className="w-full p-4 rounded-lg border bg-white/[0.01] border-white/10 flex items-center justify-between">
                    <div className="flex items-center space-x-3.5">
                      <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center text-gray-400 shrink-0">
                        <Linkedin className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-semibold text-white">LinkedIn Company Registry Link</h4>
                        <p className="text-[10px] text-gray-500">Coordinate and verify through LinkedIn professional registry.</p>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded">
                      {isVerified ? "Success" : "Initialize"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile;
