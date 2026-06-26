const API_URL = "http://localhost:5001/api/chatbot";

export interface ChatbotRecommendation {
  id: string;
  rank: number;
  brand: string;
  model: string;
  score?: number;
  why?: string[];
  link?: string;
}

export interface ChatbotUserView {
  summary?: string;
  recommendations?: ChatbotRecommendation[];
  next_step?: string;
  questions?: string[];
  suggestion?: string;
}

export interface ChatbotLog {
  _id: string;
  sessionId: string;
  userId?: string;
  message: string;
  response?: {
    summary?: string;
    recommendations?: ChatbotRecommendation[];
    next_step?: string;
    questions?: string[];
    suggestion?: string;
  };
  developerTrace?: {
    parsedPreferences?: Record<string, any>;
    candidateCount?: number;
    topResults?: {
      model?: string;
      score?: number;
      score_breakdown?: Record<string, number>;
    }[];
    scoringModel?: string;
    state?: string;
    missingFields?: string[];
  };
  createdAt: string;
}

export const getChatbotLogs = async (): Promise<ChatbotLog[]> => {
  const response = await fetch(`${API_URL}/logs`);

  if (!response.ok) {
    throw new Error("Failed to fetch chatbot logs");
  }

  return response.json();
};

export const getChatbotSessionLogs = async (sessionId: string): Promise<ChatbotLog[]> => {
  const response = await fetch(`${API_URL}/logs/${sessionId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch chatbot session logs");
  }

  return response.json();
};

export interface ChatbotDeveloperView {
  parsed_preferences?: {
    budget?: number | null;
    platform?: string | null;
    priorities?: string[];
    must_5g?: boolean | null;
    must_nfc?: boolean | null;
  };
  candidate_count?: number;
  top_results?: {
    model?: string;
    score?: number;
    score_breakdown?: Record<string, number>;
  }[];
  scoring_model?: string;
  state?: string;
  missing_fields?: string[];
}

export interface ChatbotResponse {
  user_view: ChatbotUserView;
  developer_view: ChatbotDeveloperView;
}

export const sendChatbotMessage = async (sessionId: string, message: string): Promise<ChatbotResponse> => {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sessionId,
      message,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Failed to get chatbot response");
  }

  return response.json();
};
