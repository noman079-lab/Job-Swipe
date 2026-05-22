import React, { createContext, useContext, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '../services/firebase';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'employer' | 'worker' | 'admin';
  onboarding_completed: boolean;
  profile_image_url?: string;
  subscription_plan?: string;
  unlocked_skills?: string[];
  is_verified?: boolean;
  university?: string;
  department?: string;
  location?: string;
  availability?: string;
  nid?: string;
  dob?: string;
  emergency_contact?: string;
  address?: string;
  bio?: string;
  skills?: string[];
  verification_status?: string;
  profile_completion_percentage?: number;
  trust_score?: number;
  xp?: number;
  company_name?: string;
  company_industry?: string;
  company_website?: string;
  company_linkedin?: string;
  recruiter_name?: string;
  company_id?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  requestOTP: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, code: string, role?: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  apiFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: () => {},
  refreshUser: async () => {},
  loginWithGoogle: async () => {},
  requestOTP: async () => ({} as ConfirmationResult),
  verifyOTP: async () => {},
  forgotPassword: async () => {},
  apiFetch: async () => ({} as Response)
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async (token: string) => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem('job_portal_token');
          setUser(null);
        }
      } else {
        const data = await res.json();
        setUser(data);
      }
    } catch (err) {
      console.error("Auth sync error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('job_portal_token');
    if (token) {
      fetchCurrentUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    
    localStorage.setItem('job_portal_token', data.token);
    setUser(data.user);
    toast.success("Welcome back! 👋");
  };

  const signup = async (data: any) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || "Signup failed");
    
    localStorage.setItem('job_portal_token', result.token);
    setUser(result.user);
    toast.success("Welcome to Job Swipe! 🚀");
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Sync with backend to get JWT and store in DB
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Google login failed");

      localStorage.setItem('job_portal_token', data.token);
      setUser(data.user);
      toast.success("Signed in with Google! 🌈");
    } catch (err: any) {
      toast.error(err.message);
      throw err;
    }
  };

  const requestOTP = async (phoneNumber: string) => {
    const res = await fetch("/api/auth/phone/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneNumber })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send OTP");
    return { phone: phoneNumber } as any; // Mocking ConfirmationResult behavior
  };

  const verifyOTP = async (confirmationResult: any, code: string, role?: string) => {
    const res = await fetch("/api/auth/phone/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        phone: confirmationResult.phone, 
        otp: code,
        role: role
      })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Phone verification failed");

    localStorage.setItem('job_portal_token', data.token);
    setUser(data.user);
    toast.success("Phone verified! 📱");
  };

  const forgotPassword = async (email: string) => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    toast.success("Reset link sent! 📧");
  };

  const logout = async () => {
    if (auth) {
      await firebaseSignOut(auth).catch(() => {});
    }
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    localStorage.removeItem('job_portal_token');
    setUser(null);
    toast.info("See you soon! 👋");
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('job_portal_token');
    if (token) await fetchCurrentUser(token);
  };

  const apiFetch = async (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('job_portal_token');
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    try {
      const res = await fetch(url, { ...options, headers });
      
      // Auto-logout if token is invalid or expired
      if (res.status === 401 || res.status === 403) {
        if (token) {
          localStorage.removeItem('job_portal_token');
          setUser(null);
          toast.error("Session expired. Please login again.");
        }
      }
      
      // For non-ok responses, try to get error message but still return response
      if (!res.ok && res.status !== 401 && res.status !== 403) {
         try {
            const clone = res.clone();
            const errorData = await clone.json();
            if (errorData.error) {
               console.error(`API Error [${url}]:`, errorData.error);
            }
         } catch (e) {
            console.error(`API Error [${url}]:`, res.statusText);
         }
      }
      
      return res;
    } catch (err) {
      console.error(`Network Error [${url}]:`, err);
      toast.error("Connection failed. Check your network.");
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, login, signup, logout, refreshUser,
      loginWithGoogle, requestOTP, verifyOTP, forgotPassword,
      apiFetch
    }}>
      {children}
      <div id="recaptcha-container"></div>
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
