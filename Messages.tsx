import { useState, useEffect, useRef } from "react";
import { 
  Send, Image, MoreVertical, Search, Inbox, 
  Calendar, FileText, Check, CheckCheck, Loader2, 
  ArrowLeft, MapPin, ExternalLink, Clock, Phone, 
  User, CheckCircle2, XCircle, Copy, Zap, Info, ShieldCheck, Mail, Link,
  MessageSquare, Sparkles, Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { format } from "date-fns";
import { cn } from "../utils/cn";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  text: string;
  type: string;
  metadata: any;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  partner_id: string;
  partner_name: string;
  partner_image: string;
  partner_role: string;
  last_message: string;
  last_message_at: string;
  unread_count: string;
}

const Messages = () => {
  const { user, apiFetch } = useAuth();
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  
  // Interview Scheduling State
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingData, setSchedulingData] = useState({
    title: "Technical Integration Interview",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    type: "online",
    address: "",
    meetingLink: "",
    contactNumber: ""
  });
  const [isSubmitingSchedule, setIsSubmitingSchedule] = useState(false);

  // Rescheduling State
  const [reschedulingRequest, setReschedulingRequest] = useState<any | null>(null);
  const [rescheduleData, setRescheduleData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    time: "10:00",
    type: "online",
    address: "",
    meetingLink: "",
    notes: ""
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { conversationId: routeConvId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const initConversations = async () => {
      setLoading(true);
      const convs = await fetchConversations();
      
      // 1. If we have a conversationId in the route
      if (routeConvId) {
        const existing = convs?.find(c => c.id === routeConvId);
        if (existing) {
          setSelectedConversation(existing);
          setShowMobileChat(true);
        } else {
          // If not in the list, try fetching it directly
          try {
             const res = await apiFetch(`/api/chat/messages/${routeConvId}`);
             if (res.ok) {
                const list = await fetchConversations();
                const found = list?.find(c => c.id === routeConvId);
                if (found) {
                    setSelectedConversation(found);
                    setShowMobileChat(true);
                }
             }
          } catch (e) {}
        }
      } 
      // 2. If we have a target user in search (legacy/compatibility)
      else if (location.search.includes('user=')) {
        const params = new URLSearchParams(location.search);
        const targetUserId = params.get('user');
        if (targetUserId) {
            try {
              const res = await apiFetch(`/api/chat/conversations/with/${targetUserId}`);
              if (res.ok) {
                const targetConv = await res.json();
                navigate(`/messages/${targetConv.id}`, { replace: true });
              }
            } catch (err) {}
        }
      }
      setLoading(false);
    };

    initConversations();
  }, [routeConvId]);

  useEffect(() => {
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (routeConvId) {
      fetchMessages(routeConvId);
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = setInterval(() => {
        fetchMessages(routeConvId, true);
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [routeConvId]);

  useEffect(() => {
    if (scrollRef.current && !messagesLoading) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await apiFetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data as Conversation[];
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (id: string, isPolling = false) => {
    if (!id) return;
    if (!isPolling) setMessagesLoading(true);
    try {
      const res = await apiFetch(`/api/chat/messages/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (!Array.isArray(data)) return;

        setMessages(prev => {
          const parsedData = data.map(m => ({
            ...m,
            metadata: typeof m.metadata === 'string' ? JSON.parse(m.metadata) : (m.metadata || {})
          }));

          if (prev.length !== parsedData.length || (parsedData.length > 0 && prev[prev.length-1]?.id !== parsedData[parsedData.length-1]?.id)) {
            return parsedData;
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      if (!isPolling) setMessagesLoading(false);
    }
  };

  const handleSend = async () => {
    const activeId = routeConvId || selectedConversation?.id;
    if (!newMessage.trim() || !activeId || sending) return;
    
    setSending(true);
    try {
      const res = await apiFetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeId,
          text: newMessage
        })
      });
      
      if (res.ok) {
        const sentMsg = await res.json();
        setMessages([...messages, { ...sentMsg, metadata: {}, type: 'text' }]);
        setNewMessage("");
        fetchConversations();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setSending(false);
    }
  };

  const handleScheduleInterview = async () => {
    const activeId = routeConvId || selectedConversation?.id;
    if (!activeId || !selectedConversation) return;
    setIsSubmitingSchedule(true);
    try {
      const res = await apiFetch("/api/interviews/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          talentId: selectedConversation.partner_id,
          ...schedulingData
        })
      });
      
      if (res.ok) {
        setIsScheduling(false);
        toast.success("Interview payload deployed! 🚀");
        fetchMessages(activeId);
        fetchConversations();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to deploy schedule");
      }
    } catch (err) {
      toast.error("Network sync failure");
    } finally {
      setIsSubmitingSchedule(false);
    }
  };

  const updateInterviewStatus = async (interviewId: string, status: string, isRequest?: boolean) => {
    const activeId = routeConvId || selectedConversation?.id;
    try {
      const endpoint = isRequest ? `/api/interviews/request/${interviewId}/status` : `/api/interviews/${interviewId}/status`;
      const res = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(`Protocol state changed: ${status.toUpperCase()}`);
        if (activeId) fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("State transition failed");
    }
  };

  const handleProposeReschedule = async () => {
    const activeId = routeConvId || selectedConversation?.id;
    if (!activeId || !reschedulingRequest) return;
    
    const requestId = reschedulingRequest.metadata?.requestId || reschedulingRequest.metadata?.interviewId;
    if (!requestId) {
        toast.error("Invalid interview identifier");
        return;
    }

    setIsSubmitingSchedule(true);
    try {
      const res = await apiFetch(`/api/interviews/request/${requestId}/propose-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rescheduleData)
      });
      
      if (res.ok) {
        setReschedulingRequest(null);
        toast.success("Reschedule proposal submitted! 📅");
        fetchMessages(activeId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to propose reschedule");
      }
    } catch (err) {
      toast.error("Network sync failure");
    } finally {
      setIsSubmitingSchedule(false);
    }
  };

  const handleRespondReschedule = async (requestId: string, messageId: string, action: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    if (!activeId) return;
    try {
      const res = await apiFetch(`/api/interviews/request/${requestId}/respond-reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, action })
      });
      if (res.ok) {
        toast.success(`Reschedule proposal ${action}`);
        fetchMessages(activeId);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to resolve reschedule proposal");
      }
    } catch (err) {
      toast.error("Network sync failure");
    }
  };

  const handleAcceptProposal = async (proposalId: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    try {
      const res = await apiFetch(`/api/employer/proposals/${proposalId}/accept`, { method: "POST" });
      if (res.ok) {
        toast.success("Elite Partnership Activated! 🚀");
        if (activeId) fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("Partnership activation failed.");
    }
  };

  const handleDeclineProposal = async (proposalId: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    try {
      const res = await apiFetch(`/api/employer/proposals/${proposalId}/decline`, { method: "POST" });
      if (res.ok) {
        toast.success("Elite Proposal Declined");
        if (activeId) fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("Partnership decline failed.");
    }
  };

  const handleConfirmDeployment = async (deploymentId: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    try {
      const res = await apiFetch(`/api/employer/deployments/${deploymentId}/confirm`, { method: "POST" });
      if (res.ok) {
        toast.success("Deployment Protocol Confirmed! ⚡");
        if (activeId) fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("Deployment confirmation failure.");
    }
  };

  const handleDeclineDeployment = async (deploymentId: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    try {
      const res = await apiFetch(`/api/employer/deployments/${deploymentId}/decline`, { method: "POST" });
      if (res.ok) {
        toast.success("Deployment Offer Declined");
        if (activeId) fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("Deployment decline failure.");
    }
  };

  const handleRespondInterest = async (status: string) => {
    const activeId = routeConvId || selectedConversation?.id;
    if (!activeId) return;
    try {
      const res = await apiFetch(`/api/employer/interests/${activeId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        toast.success(status === "accepted" ? "Mutual Interest Established! ❤️" : "Interest Declined");
        fetchMessages(activeId);
      }
    } catch (err) {
      toast.error("Failed to respond to interest request.");
    }
  };

  if (!user) {
    return (
      <div className="h-[600px] flex items-center justify-center">
        <div className="bento-card text-center p-12 space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
            <Inbox className="w-8 h-8 text-gray-500" />
          </div>
          <h2 className="text-xl font-black uppercase tracking-tight italic text-white">Console Locked_</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">
            Authentication token missing. Re-establish strategic session.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-140px)] min-h-[600px] relative">
      
      <div className={cn(
        "col-span-12 md:col-span-4 bento-card p-0 overflow-hidden flex flex-col transition-all",
        showMobileChat ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-white/10 space-y-4 bg-white/[0.02]">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Strategic Links_</h2>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-brand-primary italic">Live Sync</span>
            </div>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 group-focus-within:text-brand-primary transition-colors" />
            <input 
              type="text" 
              placeholder="Query operatives..."
              className="w-full bg-[#050505] border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-xs font-black italic outline-none focus:border-brand-primary transition-all placeholder:text-gray-800"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40 space-y-3 opacity-30">
              <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
              <span className="text-[9px] font-black uppercase tracking-[0.3em] italic">Decrypting...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center p-16 space-y-4 opacity-10">
              <Inbox className="w-16 h-16 mx-auto stroke-[0.5]" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] italic">No Active Channels</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button 
                key={conv.id}
                onClick={() => {
                  navigate(`/messages/${conv.id}`);
                }}
                className={cn(
                  "w-full p-6 flex items-center space-x-4 hover:bg-white/[0.02] transition-all text-left group border-b border-white/[0.03] relative",
                  routeConvId === conv.id ? "bg-brand-primary/5" : ""
                )}
              >
                {routeConvId === conv.id && (
                    <motion.div layoutId="active-nav" className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />
                )}
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center font-black italic text-xl border border-white/10 overflow-hidden">
                    {conv.partner_image ? <img src={conv.partner_image} alt="" className="w-full h-full object-cover" /> : (conv.partner_name ? conv.partner_name[0] : "U")}
                  </div>
                  {parseInt(conv.unread_count) > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary rounded-xl flex items-center justify-center text-[10px] font-black text-white">
                      {conv.unread_count}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-black italic text-sm tracking-tight truncate text-gray-200 group-hover:text-brand-primary transition-colors">{conv.partner_name}</p>
                    <span className="text-[8px] text-gray-600 font-black uppercase truncate italic">
                      {conv.last_message_at ? format(new Date(conv.last_message_at), "HH:mm") : "Genesis"}
                    </span>
                  </div>
                  <p className="text-[8px] text-gray-500 font-bold uppercase tracking-widest mb-1.5 truncate">
                    {conv.partner_role}
                  </p>
                  <p className={cn(
                    "text-[11px] truncate font-medium italic",
                    parseInt(conv.unread_count) > 0 ? "text-white font-black" : "text-gray-500 opacity-80"
                  )}>
                    {conv.last_message || "Awaiting signal..."}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={cn(
        "col-span-12 md:col-span-8 bento-card p-0 overflow-hidden flex flex-col transition-all",
        !showMobileChat ? "hidden md:flex" : "flex"
      )}>
        {selectedConversation ? (
          <>
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.03] backdrop-blur-md relative z-10">
              <div className="flex items-center space-x-4">
                <button onClick={() => setShowMobileChat(false)} className="p-3 md:hidden hover:bg-white/10 rounded-2xl transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center font-black italic text-brand-primary border border-brand-primary/20 overflow-hidden">
                    {selectedConversation.partner_image ? <img src={selectedConversation.partner_image} alt="" className="w-full h-full object-cover" /> : (selectedConversation.partner_name ? selectedConversation.partner_name[0] : "U")}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-4 border-[#0a0a0a]" />
                </div>
                <div>
                  <p className="font-black italic text-base tracking-tighter text-white">{selectedConversation.partner_name}</p>
                  <span className="text-[9px] text-emerald-500 font-black uppercase tracking-[0.2em] italic flex items-center">
                      <Zap className="w-3 h-3 mr-1 fill-current" />
                      active sensor p2p
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {user.role === 'employer' && (
                    <button 
                        onClick={() => setIsScheduling(true)} 
                        className="flex items-center space-x-2 px-5 py-3 bg-brand-primary/10 border border-brand-primary/20 text-brand-primary rounded-[1rem] text-[10px] font-black uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all"
                    >
                        <Calendar className="w-4 h-4" />
                        <span className="hidden sm:inline">Schedule</span>
                    </button>
                )}
                <button className="p-3 hover:bg-white/10 rounded-2xl text-gray-500 hover:text-white transition-all"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-8 bg-[#050505] custom-scrollbar relative">
              {messagesLoading ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 space-y-5">
                  <Loader2 className="w-10 h-10 animate-spin text-brand-primary" />
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] italic">Establish...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center space-y-6 opacity-10">
                   <ShieldCheck className="w-20 h-20 stroke-[0.3]" />
                   <p className="text-sm font-black uppercase tracking-[0.5em] italic text-center">Zero Trace Communication Active</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === user.id;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const showTime = !prevMsg || (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 10 * 60 * 1000);

                  return (
                    <div key={msg.id} className="space-y-6">
                      {showTime && (
                        <div className="flex justify-center my-6">
                          <span className="px-4 py-1.5 bg-white/[0.03] border border-white/5 rounded-2xl text-[9px] font-black uppercase text-gray-700 tracking-[0.3em] italic">
                            {format(new Date(msg.created_at), "MMM d · HH:mm 'SIGNAL'")}
                          </span>
                        </div>
                      )}
                      
                      <div className={cn("flex group", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn("max-w-[85%] md:max-w-[70%] flex flex-col", isMe ? "items-end" : "items-start")}>
                          {msg.type === 'interview_invite' || msg.type === 'interview_card' || msg.type === 'interview_request' ? (
                            <InterviewCard 
                              msg={msg} 
                              isMe={isMe} 
                              onStatusUpdate={updateInterviewStatus} 
                              onProposeReschedule={(reqMsg: any) => {
                                setReschedulingRequest(reqMsg);
                                const meta = reqMsg.metadata || {};
                                setRescheduleData({
                                  date: meta.date || format(new Date(), "yyyy-MM-dd"),
                                  time: meta.time || "10:00",
                                  type: meta.type || "online",
                                  address: meta.address || "",
                                  meetingLink: meta.meetingLink || "",
                                  notes: ""
                                });
                              }}
                              onMessagePartner={(role: string) => {
                                setNewMessage(`Hi, regarding the scheduled interview: `);
                                setTimeout(() => inputRef.current?.focus(), 50);
                              }}
                            />
                          ) : msg.type === 'reschedule_proposal' ? (
                            <RescheduleProposalCard 
                              msg={msg} 
                              isMe={isMe} 
                              onAccept={() => handleRespondReschedule(msg.metadata?.requestId, msg.id, 'accepted')} 
                              onDecline={() => handleRespondReschedule(msg.metadata?.requestId, msg.id, 'declined')} 
                            />
                          ) : msg.type === 'elite_proposal' ? (
                            <EliteProposalCard 
                              msg={msg} 
                              isMe={isMe} 
                              onAccept={() => handleAcceptProposal(msg.metadata?.proposalId)} 
                              onDecline={() => handleDeclineProposal(msg.metadata?.proposalId)} 
                              onMessagePartner={(role: string) => {
                                setNewMessage(`Hi, regarding the elite proposal: `);
                                setTimeout(() => inputRef.current?.focus(), 50);
                              }}
                            />
                          ) : msg.type === 'deployment_offer' ? (
                            <DeploymentOfferCard 
                              msg={msg} 
                              isMe={isMe} 
                              onConfirm={() => handleConfirmDeployment(msg.metadata?.deploymentId)} 
                              onDecline={() => handleDeclineDeployment(msg.metadata?.deploymentId)} 
                              onMessagePartner={(role: string) => {
                                setNewMessage(`Hi, regarding the direct deployment: `);
                                setTimeout(() => inputRef.current?.focus(), 50);
                              }}
                            />
                          ) : msg.type === 'interest_request' ? (
                            <InterestRequestCard 
                              msg={msg} 
                              isMe={isMe} 
                              onRespond={handleRespondInterest} 
                            />
                          ) : msg.type === 'mutual_engagement' || msg.type === 'mutual_match' ? (
                            <MutualMatchCard 
                              msg={msg} 
                              isMe={isMe} 
                              onSelectPrompt={(text: string) => {
                                setNewMessage(`Regarding ${msg.metadata?.jobTitle || 'our connection'}: I'd like to ${text.toLowerCase()}.`);
                                setTimeout(() => inputRef.current?.focus(), 50);
                              }}
                            />
                          ) : msg.type === 'system' ? (
                            <div className="w-full flex justify-center my-4">
                                <div className="px-6 py-3 bg-white/[0.02] border border-white/5 rounded-2xl text-[10px] font-black italic uppercase text-brand-primary tracking-widest">
                                    SYSTEM_LOG: {msg.text}
                                </div>
                            </div>
                          ) : (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className={cn(
                                "p-5 rounded-[2rem] text-sm italic font-medium leading-relaxed transition-all shadow-2xl relative",
                                isMe ? "bg-brand-primary text-white rounded-tr-none" : "bg-white/[0.03] text-gray-200 rounded-tl-none border border-white/5"
                                )}
                            >
                                {msg.text}
                            </motion.div>
                          )}
                          
                          {msg.type !== 'system' && (
                            <div className="flex items-center space-x-2 mt-2.5 px-2">
                                <p className="text-[9px] text-gray-700 font-bold uppercase tracking-widest italic">{format(new Date(msg.created_at), "HH:mm")}</p>
                                {isMe && (msg.is_read ? <CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Check className="w-3.5 h-3.5 text-gray-800" />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 bg-[#0a0a0a] border-t border-white/5 relative z-10">
              <div className="flex items-center space-x-4 bg-[#050505] p-2 rounded-[2.5rem] border border-white/5 focus-within:border-brand-primary/30 transition-all">
                <button className="p-4 hover:bg-white/5 rounded-full text-gray-700 hover:text-white transition-all"><Image className="w-5 h-5" /></button>
                <input 
                  type="text"
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={sending}
                  placeholder="Transmit encrypted payload..."
                  className="flex-1 bg-transparent border-none px-2 py-4 text-sm italic font-black text-white focus:outline-none placeholder:text-gray-800"
                />
                <button 
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className={cn(
                    "p-4 bg-brand-primary text-white rounded-full shadow-2xl transition-all",
                    (!newMessage.trim() || sending) ? "opacity-50" : "hover:scale-105"
                  )}
                >
                  {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center space-y-10 opacity-30">
            <ShieldCheck className="w-12 h-12 text-brand-primary" />
            <h3 className="text-3xl font-black italic uppercase tracking-tighter text-white">Select a channel to initiate link_</h3>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isScheduling && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsScheduling(false)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black italic uppercase text-white">Schedule Audit_</h2>
                        <button onClick={() => setIsScheduling(false)} className="p-2 hover:bg-white/5 rounded-xl"><XCircle className="w-6 h-6 text-gray-500" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <Input label="Title" value={schedulingData.title} onChange={(v:string) => setSchedulingData({...schedulingData, title: v})} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Date" type="date" value={schedulingData.date} onChange={(v:string) => setSchedulingData({...schedulingData, date: v})} />
                                <Input label="Time" type="time" value={schedulingData.time} onChange={(v:string) => setSchedulingData({...schedulingData, time: v})} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['physical', 'online', 'phone'].map(t => (
                                    <button key={t} onClick={() => setSchedulingData({...schedulingData, type: t})} className={cn("py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border", schedulingData.type === t ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-white/10 text-gray-500")}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                             {schedulingData.type === 'physical' ? (
                                <Input label="Address" placeholder="Physical location" value={schedulingData.address} onChange={(v:string) => setSchedulingData({...schedulingData, address: v})} textarea />
                             ) : schedulingData.type === 'online' ? (
                                <Input label="Link" placeholder="Zoom/Meet link" value={schedulingData.meetingLink} onChange={(v:string) => setSchedulingData({...schedulingData, meetingLink: v})} />
                             ) : (
                                <Input label="Phone" placeholder="+8801..." value={schedulingData.contactNumber} onChange={(v:string) => setSchedulingData({...schedulingData, contactNumber: v})} />
                             )}
                             <Input label="Notes" value={schedulingData.description} onChange={(v:string) => setSchedulingData({...schedulingData, description: v})} textarea />
                        </div>
                    </div>
                    <button onClick={handleScheduleInterview} disabled={isSubmitingSchedule} className="w-full py-3.5 bg-brand-primary hover:bg-brand-secondary text-white rounded-xl text-xs font-semibold transition-all">
                        {isSubmitingSchedule ? "Scheduling..." : "Schedule Interview"}
                    </button>
                </div>
            </motion.div>
          </div>
        )}
        
        {reschedulingRequest && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setReschedulingRequest(null)} className="absolute inset-0 bg-black/90 backdrop-blur-md" />
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} className="relative w-full max-w-2xl bg-[#0D0D0D] border border-white/10 rounded-[3rem] p-10 shadow-2xl">
                <div className="space-y-8 relative z-10">
                    <div className="flex items-center justify-between">
                        <h2 className="text-3xl font-black italic uppercase text-white">Propose Reschedule Slot_</h2>
                        <button onClick={() => setReschedulingRequest(null)} className="p-2 hover:bg-white/5 rounded-xl"><XCircle className="w-6 h-6 text-gray-500" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Proposed Date" type="date" value={rescheduleData.date} onChange={(v:string) => setRescheduleData({...rescheduleData, date: v})} />
                                <Input label="Proposed Time" type="time" value={rescheduleData.time} onChange={(v:string) => setRescheduleData({...rescheduleData, time: v})} />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['physical', 'online', 'phone'].map(t => (
                                    <button key={t} onClick={() => setRescheduleData({...rescheduleData, type: t})} className={cn("py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border", rescheduleData.type === t ? "border-brand-primary text-brand-primary bg-brand-primary/10" : "border-white/10 text-gray-500")}>{t}</button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-4">
                             {rescheduleData.type === 'physical' ? (
                                <Input label="Address" placeholder="Physical location" value={rescheduleData.address} onChange={(v:string) => setRescheduleData({...rescheduleData, address: v})} textarea />
                             ) : rescheduleData.type === 'online' ? (
                                <Input label="Link" placeholder="Zoom/Meet link" value={rescheduleData.meetingLink} onChange={(v:string) => setRescheduleData({...rescheduleData, meetingLink: v})} />
                             ) : (
                                <Input label="Phone" placeholder="Contact number" value={rescheduleData.address} onChange={(v:string) => setRescheduleData({...rescheduleData, address: v})} />
                             )}
                             <Input label="Context / Notes" placeholder="Reason for rescheduling or instructions" value={rescheduleData.notes} onChange={(v:string) => setRescheduleData({...rescheduleData, notes: v})} textarea />
                        </div>
                    </div>
                    <button onClick={handleProposeReschedule} disabled={isSubmitingSchedule} className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black rounded-xl text-xs font-black uppercase tracking-wider transition-all">
                        {isSubmitingSchedule ? "Transmitting Proposal..." : "Submit Reschedule Proposal"}
                    </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InterviewCard = ({ msg, isMe, onStatusUpdate, onMessagePartner, onProposeReschedule }: any) => {
    const meta = msg.metadata || {};
    const status = meta.status || 'pending';
    const interviewId = meta.interviewId || meta.requestId;
    const isRequest = msg.type === 'interview_request' || !!meta.requestId;

    const getStatusColor = () => {
        switch (status.toLowerCase()) {
            case 'accepted': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
            case 'rejected': return 'bg-red-500/10 border-red-500/20 text-red-500';
            case 'rescheduled': return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
            case 'completed': return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-500';
            default: return 'bg-white/10 border-white/20 text-gray-400';
        }
    };

    const handleDownloadICS = () => {
        try {
            const title = meta.title || "Interview";
            const dateStr = meta.date; // "yyyy-MM-dd"
            const timeStr = meta.time; // "HH:mm"
            
            let startYear = 2026, startMonth = 5, startDay = 22;
            let startHour = 10, startMinute = 0;
            
            if (dateStr) {
                const dateParts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
                if (dateParts) {
                    startYear = parseInt(dateParts[1], 10);
                    startMonth = parseInt(dateParts[2], 10);
                    startDay = parseInt(dateParts[3], 10);
                } else {
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        startYear = d.getFullYear();
                        startMonth = d.getMonth() + 1;
                        startDay = d.getDate();
                    }
                }
            }
            
            if (timeStr) {
                const timeParts = timeStr.match(/(\d{1,2}):(\d{2})/);
                if (timeParts) {
                    startHour = parseInt(timeParts[1], 10);
                    startMinute = parseInt(timeParts[2], 10);
                }
            }
            
            const localDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
            const pad = (num: number) => num.toString().padStart(2, '0');
            
            const yyyymmdd = `${startYear}${pad(startMonth)}${pad(startDay)}`;
            const hhmmss = `${pad(startHour)}${pad(startMinute)}00`;
            const dtStart = `${yyyymmdd}T${hhmmss}`;
            
            const endDate = new Date(localDate.getTime() + 60 * 60 * 1000); // 1 hour duration
            const dtEnd = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
            
            const locationVal = meta.type === 'physical' 
                ? (meta.address || "Physical Location") 
                : (meta.meetingLink || "Online Meeting");
                
            const descriptionVal = `Interview: ${title}\\nType: ${meta.type || "Interview"}\\nDate: ${dateStr}\\nTime: ${timeStr}`;
            
            const icsContent = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Student-Work Match Platform//Interview Schedule//EN",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "BEGIN:VEVENT",
                `UID:${interviewId || Date.now()}-interview@platform.com`,
                `DTSTAMP:${yyyymmdd}T000000`,
                `DTSTART:${dtStart}`,
                `DTEND:${dtEnd}`,
                `SUMMARY:${title}`,
                `DESCRIPTION:${descriptionVal}`,
                `LOCATION:${locationVal}`,
                "END:VEVENT",
                "END:VCALENDAR"
            ].join("\r\n");
            
            const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_schedule.ics`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast.success("Calendar sync file downloaded!");
        } catch (error) {
            console.error(error);
            toast.error("Could not generate calendar file");
        }
    };

    return (
        <motion.div initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-8 rounded-3xl border border-[rgba(255,255,255,0.08)] space-y-6 max-w-sm w-full shadow-2xl bg-[#111827]")}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-1">Interview Audit_</p>
                    <h4 className="text-xl font-black italic uppercase text-white">{meta.title}</h4>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", getStatusColor())}>{status}</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5"><p className="text-[8px] font-black text-gray-500 uppercase">Date</p><p className="text-xs font-black italic">{meta.date}</p></div>
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5"><p className="text-[8px] font-black text-gray-500 uppercase">Time</p><p className="text-xs font-black italic">{meta.time}</p></div>
            </div>
            <div className="p-4 rounded-3xl bg-black/40 border border-white/5 space-y-2 relative group-item">
                <p className="text-[8px] font-black text-gray-500 uppercase">{meta.type === 'physical' ? 'Physical Coordinates' : 'Digital Link'}</p>
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium italic truncate flex-1">{meta.type === 'physical' ? (meta.address || 'Deploying Location...') : (meta.meetingLink || 'Awaiting Link...') }</p>
                    {meta.type === 'physical' && meta.address && (
                        <div className="flex items-center space-x-1 ml-2">
                             <button onClick={() => {
                                 navigator.clipboard.writeText(meta.address);
                                 toast.success("Coordinates Copied");
                              }} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Copy Address">
                                 <Copy className="w-3 h-3 text-gray-500" />
                              </button>
                             <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meta.address)}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="View Map">
                                 <MapPin className="w-3 h-3 text-brand-primary" />
                             </a>
                        </div>
                    )}
                    {meta.type !== 'physical' && meta.meetingLink && (
                         <a href={meta.meetingLink} target="_blank" rel="noreferrer" className="p-1.5 bg-brand-primary/20 text-brand-primary hover:bg-brand-primary hover:text-white rounded-lg transition-all ml-2">
                            <ExternalLink className="w-3 h-3" />
                         </a>
                    )}
                </div>
            </div>

            {/* Sync to Calendar Button */}
            <button 
                onClick={handleDownloadICS}
                className="w-full py-3.5 bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary border border-brand-primary/20 hover:border-brand-primary/40 rounded-2xl text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all"
            >
                <Download className="w-3.5 h-3.5" />
                <span>Sync to Calendar</span>
            </button>

            {/* Propose Reschedule button */}
            {(status === 'pending' || status === 'accepted') && onProposeReschedule && (
                <button 
                    onClick={() => onProposeReschedule(msg)}
                    className="w-full py-3.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 hover:border-amber-500/40 rounded-2xl text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all"
                >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Propose Reschedule</span>
                </button>
            )}

            {/* Controls based on status and role */}
            {status === 'pending' && !isMe && (
                <div className="flex items-center space-x-3 pt-2">
                    <button onClick={() => onStatusUpdate(interviewId, 'accepted', isRequest)} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Accept</button>
                    <button onClick={() => onStatusUpdate(interviewId, 'rejected', isRequest)} className="flex-1 py-4 bg-white/5 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">Reject</button>
                </div>
            )}

            {status === 'accepted' && (
                <div className="pt-2 space-y-3">
                    {!isMe ? (
                         <button onClick={() => onStatusUpdate(interviewId, 'rescheduled', isRequest)} className="w-full py-4 bg-white/5 text-amber-500 border border-amber-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest">Request Reschedule</button>
                    ) : (
                         <button onClick={() => onStatusUpdate(interviewId, 'completed', isRequest)} className="w-full py-4 bg-cyan-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-cyan-500/20">Mark as Completed</button>
                    )}
                </div>
            )}

            {status === 'rescheduled' && isMe && (
                <button onClick={() => onStatusUpdate(interviewId, 'pending', isRequest)} className="w-full py-4 bg-brand-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Submit New Schedule_</button>
            )}

            {onMessagePartner && (
                <button 
                  onClick={() => onMessagePartner(isMe ? 'Candidate' : 'Employer')} 
                  className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 rounded-2xl text-[9px] font-mono font-black uppercase tracking-widest flex items-center justify-center space-x-2 transition-all mt-2"
                >
                  <MessageSquare className="w-3 h-3 text-cyan-400" />
                  <span>Message {isMe ? 'Candidate' : 'Employer'}</span>
                </button>
            )}
        </motion.div>
    );
};

const RescheduleProposalCard = ({ msg, isMe, onAccept, onDecline }: any) => {
    const meta = msg.metadata || {};
    const status = meta.status || 'pending';
    const isProposer = meta.proposerId === msg.sender_id;

    const getStatusColor = () => {
        switch (status.toLowerCase()) {
            case 'accepted': return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500';
            case 'declined': return 'bg-red-500/10 border-red-500/20 text-red-500';
            default: return 'bg-white/10 border-white/20 text-gray-400';
        }
    };

    return (
        <motion.div initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-8 rounded-3xl border border-[rgba(255,255,255,0.08)] space-y-6 max-w-sm w-full shadow-2xl bg-[#111827]")}>
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-1 text-amber-500">Reschedule Proposal_</p>
                    <h4 className="text-xl font-black italic uppercase text-white">{meta.title || "Interview Slot"}</h4>
                </div>
                <div className={cn("px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border", getStatusColor())}>{status}</div>
            </div>

            <p className="text-xs text-gray-400 italic">
                {isMe ? "You proposed a new schedule option for this interview protocol." : "The other party proposed a new schedule option."}
            </p>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5">
                    <p className="text-[8px] font-black text-gray-500 uppercase">Proposed Date</p>
                    <p className="text-xs font-black italic text-amber-400">{meta.date}</p>
                </div>
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5">
                    <p className="text-[8px] font-black text-gray-500 uppercase">Proposed Time</p>
                    <p className="text-xs font-black italic text-amber-400">{meta.time}</p>
                </div>
            </div>

            <div className="p-4 rounded-3xl bg-black/40 border border-white/5 space-y-2">
                <p className="text-[8px] font-black text-gray-500 uppercase">{meta.type === 'physical' ? 'Physical Coordinates' : 'Digital Link'}</p>
                <p className="text-xs font-medium italic truncate">{meta.type === 'physical' ? (meta.address || 'Deploying Location...') : (meta.meetingLink || 'Awaiting Link...') }</p>
            </div>

            {meta.notes && (
                <div className="p-4 rounded-3xl bg-black/40 border border-white/5">
                    <p className="text-[8px] font-black text-gray-500 uppercase">Notes</p>
                    <p className="text-xs text-gray-300 italic">{meta.notes}</p>
                </div>
            )}

            {status === 'pending' && (
                <div className="pt-2">
                    {isMe ? (
                        <div className="text-center py-3 bg-white/5 border border-white/5 rounded-2xl text-[9px] font-mono text-gray-500 uppercase tracking-widest">
                            Awaiting response...
                        </div>
                    ) : (
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={onAccept} 
                                className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all font-mono"
                            >
                                Accept
                            </button>
                            <button 
                                onClick={onDecline} 
                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-red-500 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all font-mono"
                            >
                                Decline
                            </button>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
};

const EliteProposalCard = ({ msg, isMe, onAccept, onDecline, onMessagePartner }: any) => {
    const meta = msg.metadata || {};
    const status = meta.status || 'pending';
    return (
        <motion.div initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] space-y-4 max-w-sm w-full shadow-lg bg-[#111827] relative overflow-hidden")}>
            
            <div className="flex items-center space-x-3 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-[#030303] border border-white/10 flex items-center justify-center font-bold overflow-hidden shadow-inner">
                    {meta.companyLogo ? <img src={meta.companyLogo} alt="" className="w-full h-full object-cover" /> : "💼"}
                </div>
                <div className="space-y-0.5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Premium Offer</p>
                    <h4 className="text-base font-bold text-white tracking-tight leading-none">{meta.companyName || "Premium Proposal"}</h4>
                </div>
            </div>
            
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                <div className="flex justify-between items-end border-b border-white/5 pb-3">
                    <div className="space-y-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase">Offered Budget</p>
                        <p className="text-xl font-bold text-indigo-400 leading-none">৳{meta.salary || 'Negotiable'}</p>
                    </div>
                    {meta.isUrgent && (
                        <div className="px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[9px] font-bold uppercase tracking-wide rounded mb-1">Urgent</div>
                    )}
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Job Role</p>
                    <p className="text-xs font-semibold text-white">{meta.jobTitle || "Custom Engagement"}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Description</p>
                    <p className="text-xs text-gray-300 leading-relaxed">
                        {meta.message || "Establishing new operational parameters for elite deployment."}
                    </p>
                </div>
            </div>

            {status === 'pending' && !isMe ? (
                <div className="flex items-center space-x-2 pt-1">
                    <button onClick={onAccept} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-black text-xs font-semibold rounded-lg transition-all shadow-md">Accept</button>
                    <button onClick={onDecline} className="flex-1 py-2.5 bg-white/5 text-gray-400 hover:bg-white/10 text-xs font-semibold rounded-lg border border-white/10 transition-all">Decline</button>
                </div>
            ) : (
                <div className="pt-1 text-center">
                    {status === 'accepted' ? (
                        <div className="py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">Offer Accepted ✓</div>
                    ) : status === 'declined' ? (
                        <div className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-lg">Declined ✗</div>
                    ) : (
                        <div className="py-2 text-amber-500/60 text-xs font-semibold">Awaiting response...</div>
                    )}
                </div>
            )}

            {onMessagePartner && (
                <button 
                  onClick={() => onMessagePartner(isMe ? 'Candidate' : 'Employer')} 
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all mt-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Message {isMe ? 'Candidate' : 'Employer'}</span>
                </button>
            )}
        </motion.div>
    );
};

const DeploymentOfferCard = ({ msg, isMe, onConfirm, onDecline, onMessagePartner }: any) => {
    const meta = msg.metadata || {};
    const status = meta.status || 'pending';
    return (
        <motion.div initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-6 rounded-2xl border border-[rgba(255,255,255,0.08)] space-y-4 max-w-sm w-full shadow-lg bg-[#111827] relative overflow-hidden")}>
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 overflow-hidden">
                    {meta.companyLogo ? <img src={meta.companyLogo} alt="" className="w-full h-full object-cover" /> : <Zap className="w-5 h-5 text-cyan-400 fill-current" />}
                </div>
                <div>
                    <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Instant Hire</span>
                    </div>
                    <h4 className="text-base font-bold text-white tracking-tight leading-none">{meta.companyName || "Direct Engagement"}</h4>
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-0.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Duration</p>
                    <p className="text-base font-bold text-cyan-400 leading-none">{meta.hours || 'Negotiable'} <span className="text-[10px] opacity-60 font-medium">Hours</span></p>
                </div>
                <div className="p-3 rounded-xl bg-black/20 border border-white/5 space-y-0.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase">Fixed Pay</p>
                    <p className="text-base font-bold text-cyan-400 leading-none">৳{meta.totalPay || 'Negotiable'}</p>
                </div>
            </div>

            <div className="space-y-1 bg-black/20 p-3.5 border border-white/5 rounded-xl">
                <p className="text-[10px] font-semibold text-gray-400 uppercase">Position Title</p>
                <p className="text-xs font-semibold text-white leading-relaxed">{meta.jobTitle || "Direct Freelance Hire"}</p>
            </div>

            {status === 'pending' && !isMe ? (
                <div className="flex items-center space-x-2 pt-1">
                    <button onClick={onConfirm} className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-black text-xs font-semibold rounded-lg transition-all shadow-md">Confirm</button>
                    <button onClick={onDecline} className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-semibold rounded-lg border border-white/10 transition-all">Decline</button>
                </div>
            ) : (
                <div className="pt-1 text-center">
                    {status === 'confirmed' || status === 'accepted' ? (
                        <div className="py-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg">Instant Hire Active ✓</div>
                    ) : status === 'cancelled' || status === 'declined' ? (
                        <div className="py-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold rounded-lg">Declined ✗</div>
                    ) : (
                        <div className="py-2 text-cyan-500/60 text-xs font-semibold">Awaiting response...</div>
                    )}
                </div>
            )}

            {onMessagePartner && (
                <button 
                  onClick={() => onMessagePartner(isMe ? 'Candidate' : 'Employer')} 
                  className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 rounded-lg text-[9px] font-mono font-bold uppercase tracking-wider flex items-center justify-center space-x-2 transition-all mt-2"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Message {isMe ? 'Candidate' : 'Employer'}</span>
                </button>
            )}
        </motion.div>
    );
};

const InterestRequestCard = ({ msg, isMe, onRespond }: any) => {
    const meta = msg.metadata || {};
    const status = meta.status || 'pending';
    return (
        <motion.div initial={{ opacity: 0.9, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className={cn("p-8 rounded-3xl border border-[rgba(255,255,255,0.08)] space-y-6 max-w-sm w-full shadow-2xl bg-[#111827]")}>
            <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-primary to-rose-500 flex items-center justify-center font-black italic border border-white/5 overflow-hidden">
                    {meta.companyLogo ? <img src={meta.companyLogo} alt="" className="w-full h-full object-cover" /> : "❤️"}
                </div>
                <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.4em] text-rose-500">Mutual Link Request_</p>
                     <h4 className="text-base font-black italic uppercase text-white">{meta.companyName || "Organization Interest"}</h4>
                </div>
            </div>
            
            <p className="text-xs italic text-gray-400 leading-relaxed bg-black/30 p-4 border border-white/5 rounded-2xl">
                 This corporate unit has bookmarked your profile in their core candidate vault. Would you like to mutualize communication and signal your availability?
            </p>

            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider text-gray-500 border-t border-b border-white/5 py-3 px-1 font-mono">
                 <span>CLASSIFICATION:</span>
                 <span className="text-white">TALENT MATCH</span>
            </div>

            {status === 'pending' && !isMe ? (
                <div className="flex items-center space-x-3 pt-2">
                    <button onClick={() => onRespond('accepted')} className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all">Accept Interest</button>
                    <button onClick={() => onRespond('declined')} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">Decline</button>
                </div>
            ) : (
                <div className="pt-2 text-center pb-1">
                     {status === 'accepted' ? (
                         <div className="py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl font-black">Mutual link established ✓</div>
                     ) : status === 'declined' ? (
                         <div className="py-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl">Muted ✗</div>
                     ) : (
                         <div className="py-2.5 text-rose-500/50 text-[9px] font-black uppercase tracking-widest">Awaiting Candidate Connection p2p...</div>
                     )}
                </div>
            )}
        </motion.div>
    );
};

const MutualMatchCard = ({ msg, isMe, onSelectPrompt }: any) => {
    const meta = msg.metadata || {};
    const icebreaker = meta.icebreaker || "You both showed a strong mutual interest! Connect now to start discussing options.";
    const prompts = meta.prompts || [
        "Introduce yourself",
        "Discuss availability",
        "Discuss salary expectations",
        "Share custom portfolio"
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }} 
            animate={{ opacity: 1, scale: 1, y: 0 }} 
            className="p-8 rounded-3xl border border-emerald-500/20 space-y-6 max-w-sm w-full shadow-2xl bg-[#0d1612] relative overflow-hidden my-4"
        >
            {/* Ambient Background Glow */}
            <div className="absolute -right-16 -top-16 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Title Block */}
            <div className="flex items-center space-x-3.5 relative z-10">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 shadow-inner overflow-hidden animate-pulse">
                    <Sparkles className="w-5.5 h-5.5 text-emerald-400" />
                </div>
                <div>
                     <p className="text-[9px] font-black uppercase tracking-[0.4em] text-emerald-400">SMART ENGAGEMENT ENGINE_</p>
                     <h4 className="text-base font-black italic uppercase text-white leading-tight">Mutual Match Detected!</h4>
                </div>
            </div>

            {/* Main Statement */}
            <div className="space-y-2 relative z-10 bg-black/40 p-4 border border-white/5 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] uppercase font-mono tracking-wider text-emerald-400 font-bold">
                    <span>CONNECTION ACTIVE</span>
                    <span>100% VALUE FIT</span>
                </div>
                <p className="text-xs text-gray-300 font-semibold leading-relaxed pt-1">
                    Both <strong>{meta.companyName || "Employer"}</strong> and <strong>{meta.candidateName || "Candidate"}</strong> are highly interested in collaborating for the <strong>{meta.jobTitle || "position"}</strong>.
                </p>
            </div>

            {/* Smart Icebreaker Section */}
            <div className="space-y-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70 font-mono">CONTEXTUAL AI INSCRIPTIONS_</p>
                <div className="text-xs bg-emerald-500/5 text-emerald-300 border border-emerald-500/15 p-4 rounded-2xl italic leading-relaxed">
                    "{icebreaker}"
                </div>
            </div>

            {/* Quick Interactive Prompt Icebreakers */}
            <div className="space-y-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 font-mono">TACTICAL INITIATORS_</p>
                <div className="flex flex-col gap-2">
                    {prompts.map((prompt: string, idx: number) => (
                        <button
                            key={idx}
                            onClick={() => onSelectPrompt(prompt)}
                            className="w-full text-left p-3.5 rounded-xl bg-white/[0.02] hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 text-xs text-gray-300 hover:text-white transition-all duration-200 flex items-center justify-between font-medium group cursor-pointer"
                        >
                            <span>{prompt}</span>
                            <Send className="w-3 h-3 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />
                        </button>
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

const Input = ({ label, placeholder, value, onChange, type = "text", textarea }: any) => (
    <div className="space-y-2">
        <label className="text-[9px] font-black uppercase text-gray-600 tracking-widest italic ml-1">{label}</label>
        {textarea ? (
            <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#050505] border border-white/10 rounded-2xl px-6 py-4 text-xs font-black italic outline-none focus:border-brand-primary min-h-[80px]" />
        ) : (
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-[#050505] border border-white/10 rounded-2xl px-6 py-4 text-xs font-black italic outline-none focus:border-brand-primary" />
        )}
    </div>
);

export default Messages;
