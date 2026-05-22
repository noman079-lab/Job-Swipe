import React, { useState, useEffect, useRef } from "react";
import { User, Shield, Award, Star, Settings, ExternalLink, Calendar, Mail, MapPin, GraduationCap, FileText, CheckCircle2, Upload, Fingerprint, Save, XCircle, Camera, Loader2, Trash2, Bookmark, Zap, Briefcase, Plus, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";
import { formatDate } from "../utils/date";
import CompanyProfile from "../components/CompanyProfile";

const REAL_SKILLS = [
  "React.js", "Node.js", "Cybersecurity", "Python", "UI/UX Design", 
  "Data Analysis", "Machine Learning", "DevOps", "Digital Marketing", 
  "Flutter", "Java", "SQL", "Cloud Computing", "Ethical Hacking", 
  "AI/ML", "Content Writing", "Video Editing", "Graphic Design"
];

const Profile = () => {
  const { user, apiFetch, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('saved');
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [showImageModal, setShowImageModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [savedJobs, setSavedJobs] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  
  const [experiences, setExperiences] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [isExpModalOpen, setIsExpModalOpen] = useState(false);
  const [editingExp, setEditingExp] = useState<any>(null);
  const [expLoading, setExpLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newSkill, setNewSkill] = useState("");
  const currentUserId = user?.id;

  // Profile State
  const [profileData, setProfileData] = useState({
    name: "",
    university: "",
    department: "",
    location: "",
    email: "",
    availability: "",
    nid: "",
    dob: "",
    emergencyContact: "",
    address: "",
    bio: "",
    skills: [] as string[],
    unlocked_skills: [] as string[],
    profile_image_url: "",
    nid_front_url: "",
    nid_back_url: "",
    resume_url: "",
    verification_status: "unverified",
    profile_completion_percentage: 0,
    trust_score: 0,
    xp: 0,
    level: 1,
    subscription_plan: "free"
  });

  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        ...user,
        skills: user.skills || [],
        unlocked_skills: user.unlocked_skills || [],
        emergencyContact: user.emergency_contact || prev.emergencyContact,
      }));
      if (user.role === 'worker') {
        fetchSavedJobs();
        fetchExperience();
        fetchAchievements();
      }
    }
  }, [user]);

  const fetchExperience = async () => {
    try {
      const res = await apiFetch("/api/user/profile/experience");
      if (res.ok) setExperiences(await res.json());
    } catch (err) {}
  };

  const fetchAchievements = async () => {
    try {
      const res = await apiFetch("/api/user/achievements");
      if (res.ok) setAchievements(await res.json());
    } catch (err) {}
  };

  const handleSaveExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = {
      role: formData.get('role'),
      company: formData.get('company'),
      period: formData.get('period'),
      description: formData.get('description'),
    };

    setExpLoading(true);
    try {
      const res = await apiFetch("/api/user/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        toast.success("Work record added!");
        fetchExperience();
        setIsExpModalOpen(false);
      }
    } catch (err) {
      toast.error("Failed to save experience details");
    } finally {
      setExpLoading(false);
    }
  };

  const deleteExperience = async (id: string) => {
    try {
      const res = await apiFetch(`/api/user/profile/experience/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExperiences(prev => prev.filter(e => e.id !== id));
        toast.success("Work record removed");
      }
    } catch (err) {}
  };

  const fetchSavedJobs = async () => {
    setLoadingSaved(true);
    try {
      const res = await apiFetch("/api/user/saved-jobs");
      if (res.ok) {
        const data = await res.json();
        setSavedJobs(data);
      }
    } catch (err) {
      console.error("Failed to fetch saved jobs:", err);
    } finally {
      setLoadingSaved(false);
    }
  };

  const removeSavedJob = async (jobId: string) => {
    try {
      const res = await apiFetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.saved === false) {
          setSavedJobs(prev => prev.filter(j => j.id !== jobId));
          toast.success("Removed from saved list");
        }
      }
    } catch (err) {
      toast.error("Failed to update saved jobs list");
    }
  };

  const fetchProfile = async () => {
    await refreshUser();
  };

  const handleFileSelect = (target: 'profile' | 'nid' | 'resume') => {
    const input = document.createElement('input');
    input.type = 'file';
    if (target === 'resume') {
      input.accept = '.pdf,.doc,.docx';
    } else {
      input.accept = 'image/*';
    }
    
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      const maxSize = target === 'resume' ? 10 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File size exceeds ${maxSize / (1024 * 1024)}MB limit`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (target === 'profile') {
          setPreviewImage(base64);
          setShowImageModal(true);
        } else if (target === 'nid') {
          handleNidUpload(base64);
        } else if (target === 'resume') {
          handleResumeUpload(base64, file.name);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleNidUpload = async (idImage: string) => {
    setIsUploading(true);
    try {
      const res = await apiFetch("/api/upload/nid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, frontImage: idImage })
      });
      if (res.ok) {
        toast.success("Verification documents uploaded! Pending review.");
        fetchProfile();
      }
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResumeUpload = async (resumeData: string, fileName: string) => {
    setIsUploading(true);
    try {
      const res = await apiFetch("/api/upload/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, resumeData, fileName })
      });
      if (res.ok) {
        toast.success("Resume attached successfully!");
        fetchProfile();
      }
    } catch (err) {
      toast.error("Resume attachment failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadImage = async () => {
    if (!previewImage) return;

    setIsUploading(true);
    try {
      const res = await apiFetch("/api/upload/profile-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, imageData: previewImage })
      });

      const data = await res.json();
      if (data.success) {
        setProfileData(prev => ({ ...prev, profile_image_url: data.imageUrl }));
        setShowImageModal(false);
        setPreviewImage(null);
        toast.success("Profile photo updated!");
        fetchProfile();
      } else {
        toast.error(data.error || "Upload failed");
      }
    } catch (err) {
      toast.error("Network error during photo upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResetImage = async () => {
     setIsUploading(true);
     try {
       const res = await apiFetch("/api/upload/profile-image", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ userId: currentUserId, imageData: "" })
       });
       if (res.ok) {
         setProfileData(prev => ({ ...prev, profile_image_url: "" }));
         setShowImageModal(false);
         toast.success("Profile photo cleared");
         fetchProfile();
       }
     } catch (err) {
       toast.error("Failed to reset photo");
     } finally {
       setIsUploading(false);
     }
  };

  const handleSave = async () => {
    setIsUploading(true);
    try {
      const res = await apiFetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          ...profileData,
          emergency_contact: profileData.emergencyContact
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        toast.success("Profile data synchronized! ✨");
        fetchProfile();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (err) {
      toast.error("Failed to connect to directory");
    } finally {
      setIsUploading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  if (user?.role === 'employer') {
    return (
      <div className="max-w-7xl mx-auto py-8">
        <CompanyProfile isEditing={isEditing} setIsEditing={setIsEditing} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 pb-20">
      <AnimatePresence>
        {showImageModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 max-w-sm w-full shadow-xl space-y-6 text-center"
            >
              <div className="space-y-1 text-left">
                <h2 className="text-lg font-bold text-white">Adjust Avatar Selection</h2>
                <p className="text-gray-400 text-xs">Verify your uploaded file frame alignment.</p>
              </div>

              <div className="w-40 h-40 mx-auto rounded-full border border-brand-primary/20 p-1 bg-brand-primary/5">
                <img src={previewImage || ""} className="w-full h-full object-cover rounded-full" />
              </div>

              <div className="flex flex-col space-y-2">
                <button 
                  onClick={handleUploadImage}
                  disabled={isUploading}
                  className="w-full btn-primary py-2 flex items-center justify-center space-x-2 text-xs font-semibold"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                  <span>{isUploading ? "Uploading..." : "Publish Image"}</span>
                </button>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={handleResetImage}
                    disabled={isUploading}
                    className="flex-1 py-1.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs font-semibold hover:bg-rose-500/15"
                  >
                    Reset Photo
                  </button>
                  <button 
                    onClick={() => { setShowImageModal(false); setPreviewImage(null); }}
                    className="flex-1 py-1.5 rounded bg-white/5 text-gray-300 border border-white/10 text-xs font-semibold hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isExpModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111827] border border-white/[0.08] rounded-xl p-6 max-w-md w-full shadow-xl space-y-5"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                <div className="space-y-0.5 text-left">
                  <h2 className="text-lg font-bold text-white">Add Experience</h2>
                  <p className="text-gray-400 text-xs">Outline historical professional records.</p>
                </div>
                <button 
                  onClick={() => setIsExpModalOpen(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 text-gray-400 hover:text-white"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveExperience} className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Role Title</label>
                  <input name="role" required className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none" placeholder="e.g. Lead React Developer" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Company / Institution Name</label>
                  <input name="company" required className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none" placeholder="e.g. Pathao" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Time Frame Period</label>
                  <input name="period" required className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none" placeholder="e.g. June 2023 - Present" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Brief Role Summary</label>
                  <textarea name="description" required rows={3} className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none resize-none leading-relaxed" placeholder="Highlight key duties, stack elements, and project milestones..." />
                </div>

                <div className="flex space-x-3 pt-2">
                  <button 
                    type="submit"
                    disabled={expLoading}
                    className="flex-1 btn-primary py-2 text-xs font-semibold flex items-center justify-center space-x-1"
                  >
                    {expLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin data-white" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{expLoading ? "Saving..." : "Add Work Record"}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Sidebar: Identity Card */}
      <div className="col-span-12 md:col-span-4 space-y-6">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 flex flex-col items-center text-center space-y-5">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full border border-brand-primary/20 p-0.5 bg-brand-primary/10 relative overflow-hidden shrink-0">
              <img 
                src={profileData.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileData.name}`} 
                className="rounded-full w-full h-full object-cover" 
              />
              <button 
                onClick={() => handleFileSelect('profile')}
                className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-5 h-5 text-white mb-0.5" />
                <span className="text-[10px] font-bold uppercase text-white">Upload</span>
              </button>
            </div>

            {profileData.verification_status === 'verified' && (
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1.5 border-4 border-[#111827]">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            
            {profileData.verification_status === 'verified' ? (
               <div className="absolute -top-3.5 -right-6 bg-brand-primary text-white px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border border-brand-primary/30 shadow flex items-center space-x-1">
                <Award className="w-3 h-3 text-white" />
                <span>Verified</span>
              </div>
            ) : (
              <div className="absolute top-0 -left-4 bg-amber-500/10 border border-amber-500/25 text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                Pro User
              </div>
            )}
          </div>

          <div className="space-y-1">
            {isEditing ? (
              <input 
                type="text"
                value={profileData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-lg font-bold bg-white/5 border border-white/10 rounded-lg px-2 w-full text-center outline-none focus:border-brand-primary text-white h-8"
              />
            ) : (
              <div className="flex items-center justify-center space-x-1.5">
                <h2 className="text-xl font-bold tracking-tight text-white">{profileData.name}</h2>
                {profileData.verification_status === 'verified' && (
                  <Shield className="w-4 h-4 text-brand-primary fill-current shrink-0" />
                )}
              </div>
            )}
            <p className="text-brand-primary text-xs font-semibold">
              {profileData.verification_status === 'verified' ? "Verified Recruiting Class Student" : "Qualified Candidate Hub Pro"}
            </p>
          </div>

          <div className="w-full space-y-4 pt-4 border-t border-white/[0.04] text-left">
            <InfoRow icon={<GraduationCap className="w-4 h-4" />} text={profileData.university} subtext={profileData.department} isEditing={isEditing} onEdit={(val) => handleInputChange('university', val)} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} text={profileData.location} isEditing={isEditing} onEdit={(val) => handleInputChange('location', val)} />
            <InfoRow icon={<Mail className="w-4 h-4" />} text={profileData.email} isEditing={isEditing} onEdit={(val) => handleInputChange('email', val)} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} text={profileData.availability} isEditing={isEditing} onEdit={(val) => handleInputChange('availability', val)} />
          </div>

          <div className="flex w-full space-x-2 pt-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="w-full btn-outline flex items-center justify-center space-x-1.5 py-1.5 text-xs font-semibold"
              >
                <Settings className="w-4 h-4" />
                <span>Profiles Console</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={handleSave}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white w-full py-1.5 rounded text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Sync Profile</span>
                </button>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="bg-white/5 hover:bg-white/10 text-gray-400 p-1.5 rounded flex items-center justify-center"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Dynamic Activity Gauge */}
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-6 space-y-4 text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider">Candidate Profile Completeness</h3>
            <span className="text-xs font-bold text-brand-primary">{profileData.profile_completion_percentage}%</span>
          </div>

          <div className="space-y-2">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${profileData.profile_completion_percentage}%` }}
                className="h-full bg-brand-primary"
              ></motion.div>
            </div>
            {profileData.profile_completion_percentage < 100 && (
              <p className="text-[11px] text-gray-500 font-sans leading-relaxed">Complete your profile records to receive the premium verified badge.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="col-span-12 md:col-span-8 space-y-6">
        <div className="bg-[#111827] border border-white/[0.06] rounded-xl min-h-[550px] flex flex-col p-6 text-left">
          <div className="flex space-x-6 border-b border-white/[0.04] overflow-x-auto mb-6 shrink-0">
            <TabButton active={activeTab === 'saved'} label="Saved Postings" onClick={() => setActiveTab('saved')} />
            <TabButton active={activeTab === 'verification'} label="Verification" onClick={() => setActiveTab('verification')} />
            <TabButton active={activeTab === 'experience'} label="Work History" onClick={() => setActiveTab('experience')} />
            <TabButton active={activeTab === 'skills'} label="Core Skills" onClick={() => setActiveTab('skills')} />
            <TabButton active={activeTab === 'reviews'} label="Feedbacks" onClick={() => setActiveTab('reviews')} />
          </div>

          <div className="flex-1 text-left">
            {activeTab === 'saved' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Bookmarked Opportunities</h3>
                  <span className="text-xs text-gray-400 font-semibold font-sans">{savedJobs.length} listed</span>
                </div>
                {loadingSaved ? (
                   <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-brand-primary" /></div>
                ) : savedJobs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-white/10 rounded-xl space-y-3 bg-white/[0.01]">
                    <Bookmark className="w-6 h-6 text-gray-500 mx-auto" />
                    <p className="text-xs text-gray-500 font-medium">No saved jobs listed. Swipe in the dashboard to list openings.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {savedJobs.map(job => (
                      <div key={job.id} className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg flex items-center justify-between group hover:border-[#ffffff12] transition-all">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                            {job.company_logo ? (
                              <img src={job.company_logo} className="w-full h-full object-cover" />
                            ) : (
                              <Briefcase className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          <div className="space-y-0.5 text-left">
                            <h4 className="font-semibold text-xs text-white group-hover:text-brand-primary transition-colors leading-snug">{job.title}</h4>
                            <p className="text-[10px] text-gray-500 uppercase font-semibold">{job.company_name || "Enterprise Recruiter"}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeSavedJob(job.id)}
                          className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'verification' && (
              <div className="space-y-6 max-w-2xl text-left">
                <div className={cn(
                  "flex items-center justify-between p-5 rounded-lg border relative overflow-hidden",
                  profileData.verification_status === 'verified' ? "bg-emerald-500/[0.02] border-emerald-500/20" : 
                  profileData.verification_status === 'rejected' ? "bg-red-500/[0.02] border-red-500/20" :
                  "bg-amber-500/[0.02] border-amber-500/20"
                )}>
                  <div className="flex items-center space-x-4">
                    <div className={cn(
                      "w-12 h-12 rounded flex items-center justify-center border",
                      profileData.verification_status === 'verified' ? "bg-emerald-500/10 border-emerald-500/20" : 
                      profileData.verification_status === 'rejected' ? "bg-red-500/10 border-red-500/20" :
                      "bg-amber-500/10 border-amber-500/20"
                    )}>
                      <Shield className={cn(
                        "w-6 h-6",
                        profileData.verification_status === 'verified' ? "text-emerald-400" : 
                        profileData.verification_status === 'rejected' ? "text-red-400" :
                        "text-amber-400"
                      )} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">Security Verification Standard</h4>
                      <p className={cn(
                        "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                        profileData.verification_status === 'verified' ? "text-emerald-400" : 
                        profileData.verification_status === 'rejected' ? "text-red-400" :
                        "text-amber-400"
                      )}>
                        {profileData.verification_status === 'verified' ? "Verified Student Account" : 
                         profileData.verification_status === 'rejected' ? "Verification Document Denied" : 
                         "Identity Audit Under Review"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Identity Check */}
                  <div className="bg-[#111827] border border-white/[0.04] p-4 rounded-lg space-y-4">
                    <div className="space-y-0.5 text-left">
                      <h5 className="text-xs font-bold text-white uppercase tracking-wider">Official Identification Scan</h5>
                      <p className="text-[10px] text-gray-500">Attach student card or government ID.</p>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Identity Document Serial Code</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 199XXXXXXXXXX"
                          value={profileData.nid || ""}
                          onChange={(e) => handleInputChange('nid', e.target.value)}
                          disabled={!isEditing || profileData.verification_status === 'verified'}
                          className="w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs focus:border-brand-primary outline-none text-white font-medium"
                        />
                      </div>
                      <button 
                        onClick={() => handleFileSelect('nid')}
                        disabled={isUploading || profileData.verification_status === 'verified'}
                        className={cn(
                          "w-full aspect-[16/10] border-2 border-dashed rounded-lg flex flex-col items-center justify-center space-y-2 group transition-all relative overflow-hidden",
                          profileData.nid_front_url ? "border-emerald-500/20 bg-emerald-500/[0.01]" : "border-white/10 hover:border-brand-primary/40"
                        )}
                      >
                        {profileData.nid_front_url ? (
                          <>
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <p className="text-[11px] font-semibold text-white">Verification Image Loaded</p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center">
                              {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-brand-primary" /> : <Camera className="w-5 h-5 text-gray-500 group-hover:text-brand-primary" />}
                            </div>
                            <p className="text-xs text-gray-400 group-hover:text-white transition-colors">Capture or Upload File</p>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Vetting checklist */}
                  <div className="space-y-4 flex flex-col justify-center">
                    <div className="p-5 rounded-lg bg-white/[0.01] border border-white/[0.04] space-y-4">
                       <h4 className="text-xs font-bold text-white uppercase tracking-wider">Verification Checklist benefits</h4>
                       <div className="space-y-3">
                          <Benefit icon={<Shield className="w-3.5 h-3.5 text-emerald-400" />} text="Acquire Checked Recruiter Badge" />
                          <Benefit icon={<Zap className="w-3.5 h-3.5 text-amber-400" />} text="Priority application processing" />
                          <Benefit icon={<CreditCard className="w-3.5 h-3.5 text-brand-primary" />} text="Accelerated payroll connections" />
                       </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111827] border border-white/[0.04] p-4 rounded-lg space-y-4 text-left">
                  <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                    <h5 className="text-xs font-bold text-white uppercase tracking-wider">Personal Record Matrix</h5>
                    {isEditing && (
                      <span className="text-[10px] text-brand-primary animate-pulse font-semibold">Editing Mode</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <ProfileInput 
                       label="Candidate Full Name" 
                       value={profileData.name} 
                       onChange={(val) => handleInputChange('name', val)}
                       isEditing={isEditing}
                     />
                     <ProfileInput 
                       label="NID/Student Card Reference" 
                       value={profileData.nid} 
                       onChange={(val) => handleInputChange('nid', val)}
                       isEditing={isEditing}
                     />
                     <ProfileInput 
                       label="Birth Date" 
                       value={profileData.dob} 
                       onChange={(val) => handleInputChange('dob', val)}
                       isEditing={isEditing}
                     />
                     <ProfileInput 
                       label="Emergency Cell" 
                       value={profileData.emergencyContact} 
                       onChange={(val) => handleInputChange('emergencyContact', val)}
                       isEditing={isEditing}
                     />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Physical Address</label>
                     <textarea 
                       value={profileData.address || ""}
                       onChange={(e) => handleInputChange('address', e.target.value)}
                       disabled={!isEditing}
                       className={cn(
                         "w-full bg-[#111827] border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-brand-primary h-16 resize-none leading-relaxed font-sans",
                         !isEditing && "opacity-70 cursor-not-allowed"
                       )}
                       placeholder="Provide active physical coordinates..."
                     ></textarea>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'experience' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Work Experience Record</h3>
                  <button 
                    onClick={() => { setEditingExp(null); setIsExpModalOpen(true); }}
                    className="btn-outline px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Experience</span>
                  </button>
                </div>

                <div className="space-y-4 pt-1 text-left">
                  {experiences.length > 0 ? experiences.map((exp, idx) => (
                    <div key={`${exp.id}-${idx}`} className="p-4 bg-white/[0.01] border border-white/[0.04] rounded-lg space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-white">{exp.role}</h4>
                          <p className="text-xs text-gray-400 font-medium">{exp.company} &middot; <span className="text-gray-500 font-normal">{exp.period}</span></p>
                        </div>
                        {isEditing && (
                          <button 
                            onClick={() => deleteExperience(exp.id)}
                            className="p-1.5 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed font-normal">{exp.description}</p>
                    </div>
                  )) : (
                    <div className="py-12 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-lg">
                      <Briefcase className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                      <p className="text-xs text-gray-500 font-medium">No experience records attached to profile yet.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {activeTab === 'skills' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Selected Core Competencies</h3>
                    <span className="text-xs text-gray-400 font-semibold">{profileData.skills.length} listed</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {profileData.skills.map((skill, index) => (
                      <div 
                        key={`skill-${skill}-${index}`} 
                        className="bg-brand-primary/[0.04] border border-brand-primary/15 px-3 py-2 rounded flex items-center justify-between"
                      >
                        <span className="text-xs font-semibold text-white">{skill}</span>
                        {isEditing && (
                          <button 
                            onClick={() => {
                              setProfileData(p => ({ ...p, skills: p.skills.filter((_, i) => i !== index) }));
                            }}
                            className="text-gray-500 hover:text-rose-400"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {isEditing && (
                  <div className="space-y-3 pt-4 border-t border-white/[0.04] text-left">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Add Additional Core Competencies</h4>
                    <div className="flex flex-wrap gap-2">
                       {REAL_SKILLS.filter(s => !profileData.skills.includes(s)).map((skill) => (
                         <button 
                          key={`real-skill-${skill}`}
                          onClick={() => setProfileData(p => ({ ...p, skills: [...p.skills, skill] }))}
                          className="px-2.5 py-1.5 border border-white/10 rounded bg-[#111827] text-gray-400 text-xs font-medium hover:text-white hover:border-brand-primary transition-all"
                         >
                           + {skill}
                         </button>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                <ReviewItem 
                  name="Pathao Recruiting Operations" 
                  rating={5} 
                  text="Felix possesses clean React execution habits. Timely response and detailed UI/UX alignments."
                  date="Feb 2, 2026"
                />
                <ReviewItem 
                  name="Adnan (Education Advisory Parent)" 
                  rating={5} 
                  text="Excellent patient Math tuition guidance. Improved high-turnaround score metrics significantly."
                  date="Dec 15, 2025"
                />
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

const InfoRow = ({ icon, text, subtext, isEditing, onEdit }: { icon: React.ReactNode, text: string, subtext?: string, isEditing?: boolean, onEdit?: (v: string) => void }) => (
  <div className="flex items-start space-x-3 text-left">
    <div className="text-gray-400 shrink-0 mt-0.5">{icon}</div>
    <div className="flex-1 space-y-0.5">
      {isEditing ? (
        <input 
          type="text"
          value={text}
          onChange={(e) => onEdit?.(e.target.value)}
          className="text-xs font-medium text-white bg-white/5 border border-white/10 rounded px-2 py-1 w-full outline-none focus:border-brand-primary h-7"
        />
      ) : (
        <p className="text-xs font-semibold text-gray-300 leading-none">{text}</p>
      )}
      {subtext && <p className="text-[10px] text-gray-500 font-medium uppercase font-sans leading-none">{subtext}</p>}
    </div>
  </div>
);

const TabButton = ({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`py-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 shrink-0 ${active ? "border-brand-primary text-white" : "border-transparent text-gray-500 hover:text-white"}`}
  >
    {label}
  </button>
);

const ReviewItem = ({ name, rating, text, date }: { name: string, rating: number, text: string, date: string }) => (
  <div className="bg-white/[0.01] border border-white/[0.04] p-4 rounded-lg space-y-2 text-left">
    <div className="flex justify-between items-start">
      <div className="space-y-0.5">
        <p className="font-bold text-xs text-white leading-none">{name}</p>
        <div className="flex space-x-0.5 pt-0.5">
          {[...Array(rating)].map((_, i) => <Star key={i} className="w-3 h-3 text-amber-500 fill-current shrink-0" />)}
        </div>
      </div>
      <span className="text-[10px] text-gray-500 font-bold font-sans">{date}</span>
    </div>
    <p className="text-xs text-gray-400 italic">"{text}"</p>
  </div>
);

const ProfileInput = ({ label, value, onChange, isEditing }: { label: string, value: string, onChange?: (v: string) => void, isEditing?: boolean }) => (
  <div className="space-y-1.5 text-left w-full">
    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider leading-none">{label}</label>
    <input 
      type="text" 
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={!isEditing}
      className={cn(
        "w-full bg-white/[0.01] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-brand-primary outline-none transition-all font-medium font-sans h-9",
        !isEditing && "opacity-70 cursor-not-allowed"
      )}
    />
  </div>
);

const Benefit = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center space-x-2.5">
    <div className="w-7 h-7 rounded bg-white/5 flex items-center justify-center shrink-0">
      {icon}
    </div>
    <span className="text-xs font-semibold text-gray-400">{text}</span>
  </div>
);

export default Profile;
