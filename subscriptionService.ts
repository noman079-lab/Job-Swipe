// Subscription Service
export interface PostingStatus {
  plan: 'free' | 'basic' | 'pro';
  currentUsage: number;
  limit: number;
  isEligible: boolean;
}

export const subscriptionService = {
  getPostingStatus: async (userId: string): Promise<PostingStatus> => {
    const token = localStorage.getItem('job_portal_token');
    try {
      const resp = await fetch(`/api/employer/posting-status?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error("Failed to fetch status");
      return await resp.json();
    } catch (err) {
      console.error(err);
      // Fallback for demo/mock mode
      return { plan: 'free', currentUsage: 2, limit: 3, isEligible: true };
    }
  },

  recordJobPost: async (userId: string) => {
    const token = localStorage.getItem('job_portal_token');
    try {
      const resp = await fetch('/api/employer/record-job', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId })
      });
      return await resp.json();
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  },

  createOrder: async (userId: string, planType: string, amount: number) => {
    const token = localStorage.getItem('job_portal_token');
    try {
      const resp = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, planType, amount })
      });
      return await resp.json();
    } catch (err) {
      console.error(err);
      return { success: false, error: "Network error" };
    }
  },

  createCheckoutSession: async () => {
    return { success: false, error: "Stripe has been completely removed in favor of local payment systems." };
  },

  confirmStripePayment: async () => {
    return { success: false, error: "Stripe has been completely removed in favor of local payment systems." };
  },

  verifyPayment: async (userId: string, orderId: string, transactionId: string, method?: string) => {
    const token = localStorage.getItem('job_portal_token');
    try {
      const resp = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, orderId, transactionId, method })
      });
      return await resp.json();
    } catch (err) {
      console.error(err);
      return { success: false, error: "Network error" };
    }
  },

  upgradePlan: async (userId: string, planType: string) => {
    // This is now deprecated in favor of createOrder -> verifyPayment
    console.warn("upgradePlan is deprecated. Use createOrder and verifyPayment.");
    return { success: false, error: "Direct upgrade disabled" };
  }
};
