import React, { useState, useMemo, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  Briefcase, 
  DollarSign, 
  MapPin, 
  Plus, 
  ListChecks, 
  Clock, 
  ShieldCheck,
  Zap,
  ArrowRight,
  Info,
  GraduationCap,
  Search,
  Lock
} from "lucide-react";
import { cn } from "../utils/cn";
import { BANGLADESH_UNIVERSITIES } from "../constants/universities";
import { subscriptionService, PostingStatus } from "../services/subscriptionService";
import SubscriptionModal from "../components/SubscriptionModal";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";

const CreateJob = () => {
  const navigate = useNavigate();
  const { user, apiFetch } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PostingStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Use user id if logged in, otherwise temp-user-id
  const userId = user?.id || "temp-user-id";

  const [formData, setFormData] = useState({
    title: "",
    category: "Tech",
    location: "Dhaka, Bangladesh",
    type: "internship",
    salary: "",
    hourlyRate: "",
    frequency: "monthly",
    description: "",
    requirements: "",
    responsibilities: "",
    schedule: "",
    deadline: "",
    hiresNeeded: "1",
    perks: "",
    isUrgent: false,
    isFeatured: false,
    targetUni: ""
  });
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showUniSuggestions, setShowUniSuggestions] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      const s = await subscriptionService.getPostingStatus(userId);
      setStatus(s);
    };
    const fetchCompany = async () => {
      try {
        const res = await apiFetch("/api/company/my-company");
        if (res.ok) {
          const data = await res.json();
          if (data.company) setCompanyId(data.company.id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStatus();
    fetchCompany();
  }, []);

  const filteredUnis = useMemo(() => {
    if (!formData.targetUni) return [];
    return BANGLADESH_UNIVERSITIES.filter(u => u.toLowerCase().includes(formData.targetUni.toLowerCase())).slice(0, 5);
  }, [formData.targetUni]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (status && !status.isEligible) {
      setIsModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          category: formData.category,
          company_id: companyId,
          description: formData.description,
          location: formData.location,
          type: formData.type,
          budget: formData.frequency === 'hourly' 
            ? `৳${formData.hourlyRate}/hr` 
            : formData.salary 
              ? `৳${formData.salary}${formData.frequency === 'monthly' ? '/mo' : ''}` 
              : 'Negotiable',
          minSalary: formData.salary ? parseInt(formData.salary.toString().replace(/,/g, '')) : undefined,
          hourly_rate: formData.hourlyRate ? parseInt(formData.hourlyRate) : undefined,
          isUrgent: formData.isUrgent,
          is_featured: formData.isFeatured,
          skills: formData.requirements.split('\n').filter(s => s.trim().length > 0),
          responsibilities: formData.responsibilities.split('\n').filter(s => s.trim().length > 0),
          schedule: formData.schedule,
          application_deadline: formData.deadline || null,
          hires_needed: parseInt(formData.hiresNeeded),
          experienceLevel: 'Junior'
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await subscriptionService.recordJobPost(userId);
        toast.success("Job launched successfully! 🚀");
        navigate("/employer");
      } else {
        toast.error(data.error || "Failed to create job");
      }
    } catch (err) {
      toast.error("Error connecting to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6 pb-24 px-4">
      {!companyId && (
          <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Action Required</h4>
                <p className="text-xs text-gray-400">Complete your recruiter profile to double applicant engagements.</p>
            </div>
            <button onClick={() => navigate("/employer/profile/edit")} className="px-4 py-2 bg-brand-primary text-white text-xs font-semibold rounded hover:bg-brand-secondary transition-all">Setup Recruiter Profile</button>
          </div>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-3.5 text-left">
          <div className="w-12 h-12 bg-brand-primary/10 rounded-xl flex items-center justify-center border border-brand-primary/20">
            <Plus className="w-6 h-6 text-brand-primary" />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-2xl font-bold tracking-tight text-white">Create Job Posting</h2>
            <p className="text-gray-400 text-xs font-medium">Broadcast student projects, internships, or tutoring listings.</p>
          </div>
        </div>
        
        <div className="space-y-1.5 min-w-[200px] text-left">
          <div className="flex items-center justify-between text-xs font-semibold text-gray-400 tracking-wide">
            <span>{status?.plan} Plan Limit</span>
            <span className={cn(status?.isEligible ? "text-emerald-400" : "text-brand-primary")}>
              {status?.currentUsage}/{status?.limit === 999999 ? "∞" : status?.limit}
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/[0.04]">
            <div 
              className={cn(
                "h-full transition-all duration-1000",
                status?.isEligible ? "bg-emerald-500" : "bg-brand-primary"
              )}
              style={{ width: `${Math.min((status?.currentUsage || 0) / (status?.limit || 1) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      <SubscriptionModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        usageCount={status?.currentUsage || 0}
      />

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Section 1: Essentials */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl space-y-6 p-6 relative overflow-hidden text-left">
            <div className="absolute top-0 right-0 p-6 opacity-5">
               <Briefcase className="w-24 h-24 text-white" />
            </div>
            
            <SectionHeader icon={<Info className="w-4 h-4" />} title="Listing Details" />
            
            <div className="space-y-5">
              <JobInput 
                label="Job Display Title" 
                placeholder="e.g. Frontend React Specialist" 
                value={formData.title}
                onChange={(e: any) => setFormData({...formData, title: e.target.value})}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <JobInput 
                  label="Category Classification" 
                  placeholder="e.g. Tech, Tuition, Art" 
                  value={formData.category}
                  onChange={(e: any) => setFormData({...formData, category: e.target.value})}
                />
                <JobInput 
                  label="Office Location" 
                  placeholder="e.g. Banani, Dhaka" 
                  icon={<MapPin className="w-4 h-4" />}
                  value={formData.location}
                  onChange={(e: any) => setFormData({...formData, location: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Candidate Engagement Category</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {["Internship", "Part-Time", "Full-Time", "Contract", "Hourly", "Tuition"].map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type: type.toLowerCase()})}
                      className={cn(
                        "px-3 py-2 rounded text-xs font-semibold border transition-all text-center",
                        formData.type === type.toLowerCase() ? "bg-brand-primary border-brand-primary text-white" : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Working Conditions */}
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl space-y-6 p-6 text-left">
            <SectionHeader icon={<Clock className="w-4 h-4" />} title="Work Setup & Guidance" />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Format</label>
                <div className="flex gap-2">
                  {["On-site", "Remote", "Hybrid"].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      className="flex-1 py-2 rounded bg-white/5 border border-white/10 text-xs font-semibold hover:border-brand-primary/50 text-gray-300 transition-all focus:bg-brand-primary/10 focus:border-brand-primary"
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="relative">
                <JobInput 
                  label="Target Institution (Optional)" 
                  placeholder="Search universities..." 
                  icon={<GraduationCap className="w-4 h-4" />}
                  value={formData.targetUni}
                  onFocus={() => setShowUniSuggestions(true)}
                  onChange={(e: any) => {
                    setFormData({...formData, targetUni: e.target.value});
                    setShowUniSuggestions(true);
                  }}
                />
                
                {showUniSuggestions && filteredUnis.length > 0 && (
                  <div className="absolute z-50 w-full mt-2 bg-[#111827] border border-white/10 rounded-lg overflow-hidden shadow-xl text-left">
                    {filteredUnis.map((uni, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData({...formData, targetUni: uni});
                          setShowUniSuggestions(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-brand-primary/15 hover:text-white border-b border-white/[0.04] last:border-0 flex items-center space-x-2"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{uni}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <JobInput 
              label="Minimum Requirements" 
              placeholder="Provide required criteria list...&#10;- Adobe Suite tools&#10;- Familiarity with Tailwind" 
              textarea
              icon={<ListChecks className="w-4 h-4" />}
              value={formData.requirements}
              onChange={(e: any) => setFormData({...formData, requirements: e.target.value})}
            />

            <JobInput 
              label="Job Responsibilities" 
              placeholder="Outline general duties...&#10;- Manage project backlogs&#10;- Design interface mockups" 
              textarea
              value={formData.responsibilities}
              onChange={(e: any) => setFormData({...formData, responsibilities: e.target.value})}
            />

            <JobInput 
              label="Listing Brief Description" 
              placeholder="Tell candidates about challenges, team values, and core project tasks..." 
              textarea
              value={formData.description}
              onChange={(e: any) => setFormData({...formData, description: e.target.value})}
            />

            <JobInput 
              label="Time Commitment / Schedule" 
              placeholder="e.g. 15 hours / week, flexible schedule" 
              icon={<Clock className="w-4 h-4" />}
              value={formData.schedule}
              onChange={(e: any) => setFormData({...formData, schedule: e.target.value})}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <JobInput 
                label="Application Deadline" 
                type="date"
                value={formData.deadline}
                onChange={(e: any) => setFormData({...formData, deadline: e.target.value})}
              />
              <JobInput 
                label="Vetted Open Positions Count" 
                type="number"
                placeholder="1"
                value={formData.hiresNeeded}
                onChange={(e: any) => setFormData({...formData, hiresNeeded: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Sidebar: Compensation & Submit */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-[#111827] border border-white/[0.06] rounded-xl space-y-6 p-6 text-left">
            <SectionHeader icon={<DollarSign className="w-4 h-4 text-brand-primary" />} title="Compensation Model" />
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Payment Frequency</label>
                <div className="grid grid-cols-2 gap-2">
                  {["Hourly", "Monthly"].map(freq => (
                    <button
                      key={freq}
                      type="button"
                      onClick={() => setFormData({...formData, frequency: freq.toLowerCase()})}
                      className={cn(
                        "py-2 rounded text-xs font-semibold border transition-all text-center",
                        formData.frequency === freq.toLowerCase() ? "bg-brand-primary text-white border-brand-primary" : "bg-white/5 border-white/10 text-gray-400"
                      )}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {formData.frequency === 'hourly' ? (
                  <JobInput 
                    label="Hourly Budget (৳)" 
                    placeholder="e.g. 500" 
                    value={formData.hourlyRate}
                    type="number"
                    onChange={(e: any) => setFormData({...formData, hourlyRate: e.target.value})}
                  />
                ) : (
                  <JobInput 
                    label="Monthly Base Budget (৳)" 
                    placeholder="e.g. 25000" 
                    value={formData.salary}
                    type="number"
                    onChange={(e: any) => setFormData({...formData, salary: e.target.value})}
                  />
                )}
                
                <label className="flex items-center space-x-3 cursor-pointer group pt-1">
                  <div className="p-1.5 rounded bg-white/5 border border-white/10 group-hover:border-brand-primary transition-all">
                    <input 
                      type="checkbox" 
                      className="accent-brand-primary w-3.5 h-3.5"
                      checked={formData.isFeatured}
                      onChange={(e) => setFormData({...formData, isFeatured: e.target.checked})}
                    />
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-xs font-semibold text-brand-primary tracking-wide block">Feature this Post</span>
                    <span className="text-[10px] text-gray-400 block font-normal">Positions role on top search index tier.</span>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer group pt-1">
                  <div className="p-1.5 rounded bg-white/5 border border-white/10 group-hover:border-rose-500 transition-all">
                    <input 
                      type="checkbox" 
                      className="accent-rose-500 w-3.5 h-3.5"
                      checked={formData.isUrgent}
                      onChange={(e) => setFormData({...formData, isUrgent: e.target.checked})}
                    />
                  </div>
                  <div className="text-left space-y-0.5">
                    <span className="text-xs font-semibold text-rose-400 block">Mark as Urgent</span>
                    <span className="text-[10px] text-gray-400 block font-normal font-sans">Signals high response turnaround.</span>
                  </div>
                </label>
              </div>

              <JobInput 
                label="Target Incentives / Perks" 
                placeholder="Flexible hours, verified stipend" 
                icon={<Zap className="w-4 h-4" />}
                value={formData.perks}
                onChange={(e: any) => setFormData({...formData, perks: e.target.value})}
              />
            </div>

            <div className="pt-5 border-t border-white/[0.04] space-y-4">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>Verification Fee</span>
                <span className="text-emerald-400">0 BDT (Free Standard)</span>
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className={cn(
                  "w-full py-2.5 flex items-center justify-center space-x-2 transition-all text-xs font-semibold rounded cursor-pointer border border-transparent shadow",
                  status?.isEligible 
                    ? "bg-brand-primary hover:bg-brand-secondary text-white shadow-brand-primary/10" 
                    : "bg-white/5 border-white/10 text-gray-400"
                )}
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {!status?.isEligible && <Lock className="w-3.5 h-3.5" />}
                    <span>{status?.isEligible ? "Publish Posting" : "Upgrade Subscription Tier"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="bg-[#111827] border border-white/[0.06] rounded-xl p-4 flex items-start space-x-3 text-left">
            <ShieldCheck className="w-5 h-5 text-brand-primary shrink-0" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Identity Security</h4>
              <p className="text-[11px] text-gray-400 leading-relaxed font-normal">
                Standard structural parameters apply. Clear salary listings prompt 60% faster candidate match rate.
              </p>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
  <div className="flex items-center space-x-2 mb-2 pb-2 border-b border-white/[0.04]">
    <div className="text-gray-400">
      {icon}
    </div>
    <h3 className="text-xs font-bold uppercase text-white tracking-wider">{title}</h3>
  </div>
);

const JobInput = ({ label, placeholder, textarea, icon, value, onChange, onFocus, type = "text" }: any) => (
  <div className="space-y-1.5 text-left">
    <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{label}</label>
    <div className="relative group">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500">
          {icon}
        </div>
      )}
      {textarea ? (
        <textarea 
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/[0.02] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-primary transition-all min-h-[100px] placeholder:text-gray-600 font-medium leading-relaxed font-sans",
            icon && "pl-10"
          )}
          value={value || ""}
          onChange={onChange}
          required
        />
      ) : (
        <input 
          type={type} 
          placeholder={placeholder}
          className={cn(
            "w-full bg-white/[0.02] border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white outline-none focus:border-brand-primary transition-all h-10 placeholder:text-gray-600 font-medium font-sans",
            icon && "pl-10"
          )}
          value={value || ""}
          onChange={onChange}
          onFocus={onFocus}
          required
        />
      )}
    </div>
  </div>
);

export default CreateJob;
