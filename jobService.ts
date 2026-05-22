/**
 * Service for job-related API interactions
 */

export interface JobFilters {
  search?: string;
  category?: string;
  location?: string;
  type?: string;
  minSalary?: number;
  maxSalary?: number;
  isUrgent?: boolean;
  skills?: string[];
  experienceLevel?: string;
}

export const jobService = {
  /**
   * Fetch all jobs with optional filters
   */
  async getJobs(filters: JobFilters = {}) {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.category) params.append("category", filters.category);
    if (filters.location) params.append("location", filters.location);
    if (filters.type) params.append("type", filters.type);
    if (filters.minSalary) params.append("minSalary", filters.minSalary.toString());
    if (filters.maxSalary) params.append("maxSalary", filters.maxSalary.toString());
    if (filters.isUrgent) params.append("isUrgent", "true");
    if (filters.skills && filters.skills.length > 0) params.append("skills", filters.skills.join(","));
    if (filters.experienceLevel) params.append("experienceLevel", filters.experienceLevel);

    const res = await fetch(`/api/jobs?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch jobs");
    return res.json();
  },

  /**
   * Fetch details for a specific job
   */
  async getJobById(id: string) {
    const res = await fetch(`/api/jobs/${id}`);
    if (!res.ok) throw new Error("Job not found");
    return res.json();
  },

  /**
   * Fetch all saved jobs for current user
   */
  async getSavedJobs(apiFetch: any) {
    const res = await apiFetch("/api/user/saved-jobs");
    if (!res.ok) throw new Error("Failed to fetch saved jobs");
    return res.json();
  },

  /**
   * Apply for a job
   */
  async applyForJob(apiFetch: any, jobId: string, message?: string) {
    const res = await apiFetch("/api/jobs/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, message })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to apply");
    return data;
  },

  /**
   * Save or unsave a job
   */
  async saveJob(apiFetch: any, jobId: string) {
    const res = await apiFetch("/api/jobs/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save job");
    return data;
  },

  /**
   * Like a job (swipe right)
   */
  async likeJob(apiFetch: any, jobId: string) {
    const res = await apiFetch(`/api/jobs/${jobId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to like job");
    return data;
  }
};
