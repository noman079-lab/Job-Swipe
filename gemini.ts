import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const geminiService = {
  analyzeResume: async (resumeText: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze this resume for a student/fresh graduate job marketplace in Bangladesh: ${resumeText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
            matchedCategories: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["score", "summary", "strengths", "improvements"],
        },
      },
    });
    return JSON.parse(response.text || "{}");
  },

  generateResume: async (prompt: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Create a professional, top-quality resume based on this information: ${prompt}. 
      Format it in clean Markdown. Include a professional summary, experience with bullet points using action verbs, skills, and education. Ensure it's tailored for a competitive student/fresh graduate job market.`,
    });
    return response.text || "";
  },

  getJobRecommendations: async (profileData: any, availableJobs: any[]) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Recommend the best jobs from this list for this user profile: 
      Profile: ${JSON.stringify(profileData)}
      Jobs: ${JSON.stringify(availableJobs)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              jobId: { type: Type.STRING },
              reason: { type: Type.STRING },
              matchPercentage: { type: Type.NUMBER },
            },
          },
        },
      },
    });
    return JSON.parse(response.text || "[]");
  },

  detectScamJob: async (jobDescription: string) => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Is this job description a scam or fake? Job: ${jobDescription}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isScam: { type: Type.BOOLEAN },
            confidence: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
          },
        },
      },
    });
    return JSON.parse(response.text || "{}");
  }
};
