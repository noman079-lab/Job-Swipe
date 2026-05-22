import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
    Bell, Calendar, Heart, ShieldCheck, Mail, Inbox, 
    ChevronRight, Check, MessageSquare, Briefcase, FileText, AlertCircle, X, Circle
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { cn } from "../utils/cn";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

type FilterType = "all" | "interviews" | "messages" | "hiring" | "applications";

const NotificationCenter = () => {
    const { apiFetch, user } = useAuth();
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [activeFilter, setActiveFilter] = useState<FilterType>("all");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const fetchNotifications = async () => {
        try {
            const res = await apiFetch("/api/misc/notifications");
            if (res.ok) {
                const data = await res.json();
                setNotifications(data);
                setUnreadCount(data.filter((n: any) => !n.is_read).length);
            }
        } catch (err) {}
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 10000); // Polling for real-time updates
            return () => clearInterval(interval);
        }
    }, [user]);

    const markAsRead = async (id?: string) => {
        try {
            await apiFetch("/api/misc/notifications/read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id })
            });
            await fetchNotifications();
        } catch (err) {}
    };

    const getNotificationCategory = (type: string): FilterType => {
        const t = (type || "").toLowerCase();
        if (["interview", "interview_request", "interview_update", "interview_invite", "interview_request_created"].includes(t)) {
            return "interviews";
        }
        if (["message", "chat"].includes(t)) {
            return "messages";
        }
        if (["hire_request", "deployment_request", "deployment_confirmed", "offer_sent", "offer", "job_invitation"].includes(t)) {
            return "hiring";
        }
        if (["interest", "mutual_match", "proposal_accepted", "elite", "elite_proposal", "application"].includes(t)) {
            return "applications";
        }
        return "hiring"; // default fallback for clean structure
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter((notif) => {
            if (activeFilter === "all") return true;
            return getNotificationCategory(notif.type) === activeFilter;
        });
    }, [notifications, activeFilter]);

    // Smart Time Grouping
    const groupedNotifications = useMemo(() => {
        const groups: { today: any[]; yesterday: any[]; earlier: any[] } = {
            today: [],
            yesterday: [],
            earlier: []
        };

        filteredNotifications.forEach(notif => {
            try {
                const date = typeof notif.created_at === "string" ? parseISO(notif.created_at) : new Date(notif.created_at);
                if (isToday(date)) {
                    groups.today.push(notif);
                } else if (isYesterday(date)) {
                    groups.yesterday.push(notif);
                } else {
                    groups.earlier.push(notif);
                }
            } catch (e) {
                groups.earlier.push(notif);
            }
        });

        return groups;
    }, [filteredNotifications]);

    // Generate neat, compact initials for names/titles
    const getInitials = (title: string, message: string) => {
        // Try parsing company name or subject from title or message
        const match = title.match(/^([A-Za-z0-9\s]+?)(?:has|invited|sent|requested)/i);
        const namePart = match ? match[1].trim() : title;
        const words = namePart.split(/\s+/).filter(Boolean);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return namePart.slice(0, 2).toUpperCase() || "JS";
    };

    const getIcon = (type: string) => {
        const t = (type || "").toLowerCase();
        switch (t) {
            case "hire_request":
            case "deployment_request":
            case "deployment_confirmed":
            case "offer":
            case "job_invitation":
                return <Briefcase className="w-3.5 h-3.5 text-blue-400" />;
            case "interview":
            case "interview_request":
            case "interview_invite":
            case "interview_update":
                return <Calendar className="w-3.5 h-3.5 text-indigo-400" />;
            case "interest":
            case "mutual_match":
                return <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/20" />;
            case "elite":
            case "elite_proposal":
            case "proposal_accepted":
                return <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />;
            case "message":
            case "chat":
                return <MessageSquare className="w-3.5 h-3.5 text-blue-400" />;
            case "application":
                return <FileText className="w-3.5 h-3.5 text-slate-400" />;
            default:
                return <AlertCircle className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    const filters: { id: FilterType; label: string }[] = [
        { id: "all", label: "All" },
        { id: "messages", label: "Messages" },
        { id: "interviews", label: "Interviews" },
        { id: "hiring", label: "Hiring" },
        { id: "applications", label: "Applications" }
    ];

    return (
        <div className="relative">
            {/* Minimal Trigger Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "relative p-2 rounded-lg transition-all duration-300 hover:bg-neutral-800 border border-transparent",
                    isOpen && "bg-neutral-800"
                )}
                aria-label="Toggle notifications center"
            >
                <Bell className={cn("w-4.5 h-4.5 text-neutral-400 hover:text-neutral-200 transition-colors", isOpen && "text-white")} />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-blue-500 rounded-full border border-[#0d0e11] animate-none" />
                )}
            </button>

            {mounted && createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <div className="fixed inset-0 z-[1000] pointer-events-none">
                            {/* Pure dark matte backdrop with zero blur overhead */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setIsOpen(false)}
                                className="fixed inset-0 bg-neutral-950/70 pointer-events-auto"
                            />
                            
                            {/* Premium Minimal Right Drawer */}
                            <motion.div 
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="fixed right-0 top-0 h-full w-[390px] max-w-full bg-[#0e1013] border-l border-neutral-800 shadow-2xl flex flex-col z-[1010] pointer-events-auto"
                            >
                                {/* Clean Header */}
                                <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-200 flex items-center gap-2">
                                            Notifications
                                            {unreadCount > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 font-medium font-sans border border-blue-500/20">
                                                    {unreadCount} unread
                                                </span>
                                            )}
                                        </h3>
                                    </div>
                                    <button 
                                        onClick={() => setIsOpen(false)}
                                        className="p-1.5 hover:bg-neutral-800 rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Compact Filter Tabs - Clean SaaS Pill Selection */}
                                <div className="px-4 py-2.5 border-b border-neutral-800 bg-neutral-900/40 flex gap-1 overflow-x-auto no-scrollbar">
                                    {filters.map((f) => {
                                        const count = f.id === "all" 
                                            ? notifications.length 
                                            : notifications.filter(n => getNotificationCategory(n.type) === f.id).length;
                                        
                                        return (
                                            <button
                                                key={f.id}
                                                onClick={() => setActiveFilter(f.id)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-md text-xs font-medium transition-all shrink-0 border",
                                                    activeFilter === f.id
                                                        ? "bg-neutral-100 text-neutral-900 border-neutral-100"
                                                        : "bg-transparent text-neutral-400 border-transparent hover:text-neutral-200 hover:bg-neutral-800/60"
                                                )}
                                            >
                                                <span>{f.label}</span>
                                                {count > 0 && activeFilter !== f.id && (
                                                    <span className="text-[9px] font-medium text-neutral-500 ml-1">
                                                        ({count})
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Main Notifications Feed */}
                                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    {filteredNotifications.length === 0 ? (
                                        <div className="py-24 text-center space-y-3">
                                            <div className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center mx-auto text-neutral-500">
                                                <Inbox className="w-4 h-4" />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-xs font-medium text-neutral-400">Everything caught up</p>
                                                <p className="text-[11px] text-neutral-500">No recent notifications under '{activeFilter}'.</p>
                                            </div>
                                        </div>
                                    ) : (
                                        (["today", "yesterday", "earlier"] as const).map((groupKey) => {
                                            const groupItems = groupedNotifications[groupKey];
                                            if (groupItems.length === 0) return null;

                                            return (
                                                <div key={groupKey} className="space-y-1.5">
                                                    {/* Clean Date Header */}
                                                    <h4 className="text-[10px] font-semibold text-neutral-500 tracking-wider uppercase pl-1 pt-2 select-none">
                                                        {groupKey === "today" ? "Today" : groupKey === "yesterday" ? "Yesterday" : "Earlier"}
                                                    </h4>
                                                    
                                                    {/* Notification Listings */}
                                                    <div className="space-y-1">
                                                        {groupItems.map((notif) => {
                                                            const initials = getInitials(notif.title || "JS", notif.message || "");
                                                            return (
                                                                <button 
                                                                    key={notif.id}
                                                                    onClick={async () => {
                                                                        await markAsRead(notif.id);
                                                                        if (notif.link) {
                                                                            navigate(notif.link);
                                                                        }
                                                                        setIsOpen(false);
                                                                    }}
                                                                    className={cn(
                                                                        "w-full p-3 rounded-lg flex items-start space-x-3 text-left transition-colors duration-150 relative group cursor-pointer",
                                                                        notif.is_read 
                                                                            ? "bg-transparent hover:bg-neutral-900/40" 
                                                                            : "bg-blue-500/[0.02] hover:bg-neutral-900/60 border-l border-blue-500/20"
                                                                    )}
                                                                >
                                                                    {/* Left Monogram / Avatar Block */}
                                                                    <div className={cn(
                                                                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border text-[10px] font-bold font-sans selection:bg-transparent relative",
                                                                        notif.is_read 
                                                                            ? "bg-neutral-900 border-neutral-800 text-neutral-400" 
                                                                            : "bg-blue-950/40 border-blue-900/40 text-blue-300"
                                                                    )}>
                                                                        {initials}
                                                                        {/* Superposed Tiny Typology Indicator */}
                                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#0e1013] rounded-full flex items-center justify-center border border-neutral-800">
                                                                            {getIcon(notif.type)}
                                                                        </div>
                                                                    </div>

                                                                    {/* Core Meta Specifications Block */}
                                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                                        <div className="flex justify-between items-baseline">
                                                                            <span className="text-[10px] font-medium text-neutral-500">
                                                                                {(() => {
                                                                                    try {
                                                                                        return format(new Date(notif.created_at), "h:mm a");
                                                                                    } catch {
                                                                                        return "Now";
                                                                                    }
                                                                                })()}
                                                                            </span>
                                                                        </div>

                                                                        <h5 className={cn(
                                                                            "text-xs font-semibold leading-relaxed tracking-tight",
                                                                            notif.is_read ? "text-neutral-300" : "text-white"
                                                                        )}>
                                                                            {notif.title}
                                                                        </h5>

                                                                        <p className="text-[11px] text-neutral-400 font-medium leading-relaxed font-sans line-clamp-2">
                                                                            {notif.message}
                                                                        </p>
                                                                    </div>

                                                                    {/* Stealth Right Chevron on Hover representing actionable state */}
                                                                    <div className="self-center opacity-0 group-hover:opacity-100 transition-opacity pl-1 shrink-0">
                                                                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                                                                    </div>

                                                                    {/* Pure minimal dot identifier */}
                                                                    {!notif.is_read && (
                                                                        <span className="absolute top-4 right-3 w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Premium Calm Footer */}
                                <div className="p-4 border-t border-neutral-800 bg-[#0e1013] flex gap-2">
                                    <button 
                                        onClick={async () => {
                                            await markAsRead();
                                            setIsOpen(false);
                                        }}
                                        className="flex-1 py-2 text-center bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 rounded-md text-xs font-semibold text-neutral-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                                    >
                                        <Check className="w-3.5 h-3.5 text-blue-400" />
                                        <span>Mark all as read</span>
                                    </button>
                                    <button
                                        onClick={() => setIsOpen(false)}
                                        className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-[#0e1013] font-semibold text-xs rounded-md transition-all"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default NotificationCenter;
