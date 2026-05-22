/**
 * Service for user-related data interactions
 */

export const userService = {
  /**
   * Fetch authenticated user's interactions (applied/saved)
   */
  async getUserInteractions(apiFetch: any) {
    const [appliedRes, savedRes] = await Promise.all([
      apiFetch(`/api/user/applied-job-ids`),
      apiFetch(`/api/user/saved-job-ids`)
    ]);
    
    if (!appliedRes.ok || !savedRes.ok) {
      throw new Error("Failed to fetch user interactions");
    }

    return {
      appliedIds: await appliedRes.json(),
      savedIds: await savedRes.json()
    };
  },

  /**
   * Fetch user dashboard data
   */
  async getDashboardData(userId: string) {
    const token = localStorage.getItem('job_portal_token');
    const res = await fetch(`/api/user/dashboard?userId=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to fetch dashboard data");
    return res.json();
  }
};
