import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Image as ImageIcon, Globe, MapPin, 
  Users, Calendar, Info, Save, Loader2, ArrowLeft,
  Briefcase, Camera, ShieldCheck, Mail, Link,
  CheckCircle2, XCircle, AlertCircle, Trash2, Plus,
  LayoutDashboard, Zap, Linkedin, Clock
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { toast } from "sonner";
import { cn } from "../utils/cn";

const CompanyProfileEdit = () => {
  const navigate = useNavigate();
  const { apiFetch, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("branding");
  const [company, setCompany] = useState<any>({
    name: "",
    logo_url: "",
    banner_url: "",
    description: "",
    industry: "Technology",
    size: "1-10",
    website: "",
    location: "Dhaka, Bangladesh",
    founded_year: new Date().getFullYear(),
    social_links: { linkedin: "", twitter: "", facebook: "" },
    verification_status: "unverified"
  });

  const [verifications, setVerifications] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  // Verification states
  const [vEmail, setVEmail] = useState("");
  const [vOtp, setVOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/company/my-company");
      if (res.ok) {
        const data = await res.json();
        if (data.company) {
          setCompany({
              ...data.company,
              social_links: typeof data.company.social_links === 'string' 
                  ? JSON.parse(data.company.social_links) 
                  : data.company.social_links || { linkedin: "", twitter: "", facebook: "" }
          });
          setVerifications(data.verifications || []);
          if (data.company.id) {
            fetchMembers(data.company.id);
          }
        }
      }
    } catch (err) {
      toast.error("Network communication failure");
    } finally {
       setLoading(false);
    }
  };

  const fetchMembers = async (companyId: string) => {
    try {
      const res = await apiFetch(`/api/company/${companyId}/members`);
      if (res.ok) setTeamMembers(await res.json());
    } catch (err) {}
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch("/api/company/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(company)
      });
      if (res.ok) {
        toast.success("Recruiter profile updated! 🏢");
        await refreshUser();
      } else {
        const err = await res.json();
        toast.error(err.error || "failed to save");
      }
    } catch (err) {
      toast.error("Sync error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "banner_url") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const res = await apiFetch("/api/upload/profile-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageData: base64 })
        });
        if (res.ok) {
            const data = await res.json();
            setCompany({ ...company, [field]: data.imageUrl });
            toast.success("Asset uploaded successfully!");
        }
      } catch (err) {
          toast.error("Upload failed");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
            const res = await apiFetch("/api/upload/image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageData: base64 })
            });
            if (res.ok) {
                const data = await res.json();
                // Submit verification
                await apiFetch("/api/company/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        companyId: company.id,
                        documentType: type,
                        documentUrl: data.imageUrl
                    })
                });
                toast.success("Credential submitted for manual audit!");
                fetchData();
            }
        } catch (err) {}
    };
    reader.readAsDataURL(file);
  };

  const requestEmailOtp = async () => {
    if (!vEmail.includes("@")) return toast.error("Invalid business domain email");
    setIsVerifying(true);
    try {
        const res = await apiFetch("/api/company/verify/email-request", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId: company.id, email: vEmail })
        });
        if (res.ok) {
            setOtpSent(true);
            toast.success("Authentication security token dispatched!");
        }
    } finally {
        setIsVerifying(false);
    }
  };

  const confirmEmailOtp = async () => {
    setIsVerifying(true);
    try {
        const res = await apiFetch("/api/company/verify/email-confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ companyId: company.id, otp: vOtp })
        });
        if (res.ok) {
            toast.success("Domain verified successfully!");
            fetchData();
            await refreshUser();
        } else {
            const err = await res.json();
            toast.error(err.error);
        }
    } finally {
        setIsVerifying(false);
    }
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
         <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
         <p className="text-xs font-semibold text-gray-500">Accessing Recruiter Profile...</p>
       </div>
     );
  }

  const tabs = [
    { id: "branding", label: "Branding", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "info", label: "Company Info", icon: <Building2 className="w-4 h-4" /> },
    { id: "verification", label: "Verification", icon: <ShieldCheck className="w-4 h-4" /> },
    { id: "team", label: "Team Members", icon: <Users className="w-4 h-4" /> }
  ];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 space-y-8 pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
         <div className="flex items-center space-x-3.5">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all group">
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold tracking-tight text-white">Recruiter Settings</h2>
                <p className="text-xs text-gray-500 font-medium flex items-center space-x-1.5">
                    <Building2 className="w-3.5 h-3.5 text-brand-primary" />
                    <span>Manage Settings for {company.name || "Unnamed Recruiter HQ"}</span>
                </p>
            </div>
         </div>
         <div className="flex items-center space-x-3">
             <button 
                onClick={() => handleSave()}
                disabled={saving}
                className="btn-primary"
             >
                {saving ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
             </button>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Navigation Sidebar */}
        <div className="md:col-span-3 space-y-2">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                        "w-full flex items-center space-x-3 px-4 py-3 rounded-lg border transition-all text-left",
                        activeTab === tab.id 
                            ? "bg-brand-primary/10 border-brand-primary/25 text-brand-primary" 
                            : "bg-white/[0.02] border-transparent text-gray-400 hover:text-gray-300 hover:bg-white/[0.04]"
                    )}
                >
                    <div className={cn(
                        "p-1.5 rounded transition-colors",
                        activeTab === tab.id ? "bg-brand-primary/20" : "bg-white/5"
                    )}>
                        {tab.icon}
                    </div>
                    <span className="text-xs font-semibold tracking-wide">{tab.label}</span>
                </button>
            ))}

            <div className="pt-6 text-left">
                <div className="p-4 rounded-xl bg-brand-primary/5 border border-brand-primary/10 space-y-1">
                    <p className="text-[10px] font-bold text-brand-primary uppercase tracking-wider">Recruiter Trust Score</p>
                    <div className="flex items-baseline space-x-1">
                        <span className="text-2xl font-bold text-white leading-none">{company.trust_score || 0}%</span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase">Vetted</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mt-2">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${company.trust_score || 10}%` }}
                            className="h-full bg-brand-primary" 
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="md:col-span-9">
            <AnimatePresence mode="wait">
                {activeTab === 'branding' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 text-left"
                    >
                        <div className="bg-[#111827] border border-white/[0.06] overflow-hidden rounded-xl">
                            <div className="relative h-44 bg-white/5 group">
                                {company.banner_url ? (
                                    <img src={company.banner_url} alt="banner" className="w-full h-full object-cover opacity-60" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                        <ImageIcon className="w-12 h-12 opacity-20" />
                                    </div>
                                )}
                                <label className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                    <div className="flex flex-col items-center space-y-2 bg-[#111827]/80 px-4 py-3 rounded-lg border border-white/10 shadow">
                                        <Camera className="w-6 h-6 text-brand-primary" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-white">Change Header Banner</span>
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "banner_url")} />
                                    </div>
                                </label>
                            </div>

                            <div className="p-6 relative mt-[-40px]">
                                <div className="relative w-24 h-24 bg-[#111827] border-2 border-[#111827] rounded-xl p-1 shadow-lg group/logo overflow-hidden">
                                     {company.logo_url ? (
                                        <img src={company.logo_url} alt="logo" className="w-full h-full object-contain rounded-lg" />
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center text-brand-primary bg-brand-primary/10 rounded-lg">
                                            <Building2 className="w-8 h-8" />
                                        </div>
                                     )}
                                     <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover/logo:opacity-100 transition-opacity cursor-pointer">
                                        <Camera className="w-5 h-5 text-white" />
                                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e, "logo_url")} />
                                     </label>
                                </div>

                                <div className="mt-6 space-y-5 max-w-2xl">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-white">Visual Corporate Identity</h3>
                                        <p className="text-xs text-gray-400">
                                            Consistent branding elements increase quality student applications by up to 50%.
                                        </p>
                                    </div>
                                    <InputGroup 
                                        label="Business Tagline / Summary" 
                                        placeholder="Brief summary of your company culture and operations..." 
                                        textarea 
                                        value={company.description} 
                                        onChange={(e:any) => setCompany({...company, description: e.target.value})} 
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'info' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left"
                    >
                        <div className="bg-[#111827] border border-white/[0.06] rounded-xl space-y-6 p-6">
                            <SectionHeader icon={<Info className="w-4 h-4" />} title="Corporate Info" />
                            <div className="space-y-4">
                                <InputGroup label="Official Company Name" placeholder="Google Inc." value={company.name} onChange={(e:any) => setCompany({...company, name: e.target.value})} />
                                <div className="grid grid-cols-2 gap-4">
                                    <InputGroup label="Industry Sector" placeholder="Technology" value={company.industry} onChange={(e:any) => setCompany({...company, industry: e.target.value})} />
                                    <InputGroup label="Employee Range" placeholder="1-10" value={company.size} onChange={(e:any) => setCompany({...company, size: e.target.value})} />
                                </div>
                                <InputGroup label="HQ Office Location" icon={<MapPin className="w-3.5 h-3.5" />} value={company.location} onChange={(e:any) => setCompany({...company, location: e.target.value})} />
                                <InputGroup label="Founded Year" type="number" icon={<Calendar className="w-3.5 h-3.5" />} value={company.founded_year} onChange={(e:any) => setCompany({...company, founded_year: e.target.value})} />
                            </div>
                        </div>

                        <div className="bg-[#111827] border border-white/[0.06] rounded-xl space-y-6 p-6">
                            <SectionHeader icon={<Globe className="w-4 h-4" />} title="Social Footprint" />
                            <div className="space-y-4">
                                <InputGroup label="Official Website Domain" icon={<Globe className="w-3.5 h-3.5" />} placeholder="https://co.com" value={company.website} onChange={(e:any) => setCompany({...company, website: e.target.value})} />
                                <div className="space-y-4 pt-4 border-t border-white/[0.04]">
                                    <InputHeader title="Social Linked Nodes" />
                                    <InputGroup label="LinkedIn Company Page" icon={<Linkedin className="w-3.5 h-3.5" />} value={company.social_links?.linkedin} onChange={(e:any) => setCompany({...company, social_links: {...company.social_links, linkedin: e.target.value}})} />
                                    <InputGroup label="Twitter/X Handle" icon={<XCircle className="w-3.5 h-3.5" />} value={company.social_links?.twitter} onChange={(e:any) => setCompany({...company, social_links: {...company.social_links, twitter: e.target.value}})} />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'verification' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 text-left"
                    >
                        <div className="bg-brand-primary/5 border border-brand-primary/15 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-hidden relative">
                            <div className="absolute top-0 right-0 p-10 opacity-[0.02] rotate-12">
                                <ShieldCheck className="w-56 h-56" />
                            </div>
                            <div className="space-y-1.5 relative z-10 max-w-xl">
                                <h3 className="text-lg font-bold text-white">Trust Audit Certification</h3>
                                <p className="text-xs text-gray-400 leading-relaxed font-normal">
                                    Upload standard registration tags to verify active recruitment mandates. Verified recruiters gain access to higher client response rates.
                                </p>
                            </div>
                            <div className="relative z-10 shrink-0">
                                <div className={cn(
                                    "flex items-center space-x-1.5 px-3 py-1 rounded border text-[11px] font-semibold",
                                    company.verification_status === 'verified' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                                )}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                    <span className="capitalize">{company.verification_status} Recruiter</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            {/* Method 1: Email Verification */}
                            <div className="lg:col-span-7 space-y-4">
                                <div className="bg-[#111827] border border-white/[0.06] p-6 rounded-xl space-y-6">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                                            <Mail className="w-4 h-4 text-brand-primary" />
                                            <span>Corporate Domain Audit</span>
                                        </h4>
                                        <p className="text-xs text-gray-400">Instantly authenticate your portal using a corporate email address.</p>
                                    </div>

                                    <div className="space-y-3">
                                        {otpSent ? (
                                            <div className="p-4 rounded-lg bg-white/[0.01] border border-white/[0.04] flex flex-col items-center justify-center space-y-4">
                                                <p className="text-xs font-bold text-brand-primary uppercase tracking-wide">Enter Security Token</p>
                                                <input 
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    value={vOtp}
                                                    onChange={(e) => setVOtp(e.target.value)}
                                                    className="w-36 bg-black/40 border border-white/10 rounded-lg py-2.5 text-center text-xl font-bold tracking-[0.2em] text-white outline-none focus:border-brand-primary"
                                                />
                                                <button 
                                                    onClick={confirmEmailOtp}
                                                    disabled={isVerifying || vOtp.length !== 6}
                                                    className="w-full btn-primary py-2 text-xs font-semibold"
                                                >
                                                    {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto text-white" /> : "Verify Security Token"}
                                                </button>
                                                <button onClick={() => setOtpSent(false)} className="text-[10px] text-gray-500 hover:text-white">Change Email Address</button>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                <InputGroup 
                                                    label="Corporate Email Base" 
                                                    placeholder="recruiting@company.com" 
                                                    type="email" 
                                                    value={vEmail} 
                                                    onChange={(e:any) => setVEmail(e.target.value)} 
                                                />
                                                <button 
                                                    onClick={requestEmailOtp}
                                                    disabled={isVerifying || !vEmail}
                                                    className="w-full py-2 btn-outline text-xs font-semibold flex items-center justify-center space-x-1.5"
                                                >
                                                    {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    <span>Send Security Token</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Method 2: Document Upload */}
                            <div className="lg:col-span-5 space-y-4">
                                <div className="bg-[#111827] border border-white/[0.06] p-6 rounded-xl space-y-4">
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                                            <Link className="w-4 h-4 text-brand-primary" />
                                            <span>Manual Credential Check</span>
                                        </h4>
                                        <p className="text-xs text-gray-400">Upload trade license documentation for validation.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <DocUploadButton 
                                            label="Trade License Scan" 
                                            icon={<Briefcase className="w-4 h-4" />} 
                                            onUpload={(e:any) => handleDocUpload(e, "trade_license")} 
                                            status={verifications.find(v => v.document_type === 'trade_license')?.status}
                                        />
                                        <DocUploadButton 
                                            label="Incorporation Slip" 
                                            icon={<Building2 className="w-4 h-4" />} 
                                            onUpload={(e:any) => handleDocUpload(e, "registration")} 
                                            status={verifications.find(v => v.document_type === 'registration')?.status}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* History Log */}
                        <div className="bg-[#111827] border border-white/[0.06] p-6 rounded-xl space-y-4">
                             <SectionHeader icon={<Clock className="w-4 h-4" />} title="Audit Activity History" />
                             <div className="space-y-3">
                                {verifications.length === 0 ? (
                                    <div className="py-8 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-lg">
                                        <p className="text-xs text-gray-500 font-medium">No historical verification logs found.</p>
                                    </div>
                                ) : (
                                    verifications.map((v, i) => (
                                        <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.01] border border-white/[0.04]">
                                            <div className="flex items-center space-x-3 text-left">
                                                <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-gray-400 uppercase font-bold text-xs">
                                                    {v.document_type[0]}
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-xs font-semibold text-white uppercase">{v.document_type.replace('_', ' ')}</p>
                                                    <p className="text-[10px] text-gray-500">{new Date(v.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className={cn(
                                                "px-2.5 py-0.5 rounded text-[10px] font-semibold",
                                                v.status === 'verified' ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                                            )}>
                                                {v.status}
                                            </div>
                                        </div>
                                    ))
                                )}
                             </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'team' && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-6 text-left"
                    >
                        <div className="bg-[#111827] border border-white/[0.06] p-6 rounded-xl space-y-6">
                            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                                <SectionHeader icon={<Users className="w-4 h-4" />} title="Hiring Team Members" />
                                <button className="btn-outline py-1.5 px-3 rounded text-xs font-semibold">
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Add Recruiter</span>
                                </button>
                            </div>

                            <div className="space-y-3">
                                {teamMembers.map(member => (
                                    <div key={member.id} className="p-4 rounded-lg bg-white/[0.01] border border-white/[0.04] flex items-center justify-between">
                                        <div className="flex items-center space-x-3.5">
                                            <div className="w-10 h-10 rounded-full border border-white/10 overflow-hidden shrink-0">
                                                <img 
                                                    src={member.profile_image_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.email}`} 
                                                    className="w-full h-full object-cover" 
                                                />
                                            </div>
                                            <div className="space-y-0.5 text-left">
                                                <h4 className="text-sm font-semibold text-white leading-tight">{member.name || member.email.split('@')[0]}</h4>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-gray-400">{member.email}</span>
                                                    <span className="w-1 h-1 bg-gray-500 rounded-full" />
                                                    <span className="text-[10px] font-semibold text-brand-primary bg-brand-primary/10 px-1.5 py-0.5 rounded capitalize">{member.role}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="p-2 bg-white/5 hover:bg-rose-500/10 text-gray-500 hover:text-rose-500 rounded transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 rounded-xl bg-white/[0.01] border border-white/5 border-dashed text-center space-y-4">
                            <Users className="w-8 h-8 text-gray-500 mx-auto" />
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-gray-300">Invite Co-Workers</p>
                                <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">Connect additional recruiting pipelines, schedule interviews together, and share central dashboard data metrics.</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
    <div className="flex items-center space-x-2">
        <div className="text-gray-400">
            {icon}
        </div>
        <h3 className="text-xs font-bold uppercase text-white tracking-wider">{title}</h3>
    </div>
);

const InputHeader = ({ title }: { title: string }) => (
    <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider text-left leading-none">{title}</h4>
);

const InputGroup = ({ label, placeholder, textarea, icon, value, onChange, type = "text" }: any) => (
    <div className="space-y-1.5 text-left w-full">
        <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider ml-0.5">{label}</label>
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
                        "w-full bg-white/[0.02] border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-white outline-none focus:border-brand-primary transition-all min-h-[120px] placeholder:text-gray-600 font-medium font-sans leading-relaxed",
                        icon && "pl-10"
                    )}
                    value={value || ""}
                    onChange={onChange}
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
                />
            )}
        </div>
    </div>
);

const DocUploadButton = ({ label, icon, onUpload, status }: any) => (
    <label className={cn(
        "flex items-center justify-between p-4 rounded-lg border transition-all cursor-pointer group text-left",
        status === 'verified' ? "bg-emerald-500/5 border-emerald-500/20" : status === 'pending' ? "bg-amber-500/5 border-amber-500/20" : "bg-white/5 border-white/10 hover:border-brand-primary/40"
    )}>
        <div className="flex items-center space-x-3">
            <div className={cn(
                "w-8 h-8 rounded flex items-center justify-center transition-colors",
                status === 'verified' ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-gray-400 group-hover:text-brand-primary"
            )}>
                {status === 'verified' ? <CheckCircle2 className="w-4 h-4" /> : icon}
            </div>
            <div>
                <p className="text-xs font-bold text-white leading-none mb-1">{label}</p>
                <p className="text-[10px] text-gray-500 font-medium font-sans">
                    {status === 'verified' ? 'Authenticated' : status === 'pending' ? 'Verification Pending' : 'Document Scan Required'}
                </p>
            </div>
        </div>
        <div className="shrink-0">
            {status ? (
                <div className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-semibold capitalize",
                    status === 'verified' ? "bg-emerald-500/15 text-emerald-500" : "bg-amber-500/15 text-amber-500"
                )}>
                    {status}
                </div>
            ) : (
                <div className="px-2 py-1 rounded bg-white/5 text-gray-400 group-hover:text-white transition-colors text-[10px] font-semibold">Upload</div>
            )}
        </div>
        <input type="file" className="hidden" accept="application/pdf,image/*" onChange={onUpload} disabled={!!status} />
    </label>
);

export default CompanyProfileEdit;
