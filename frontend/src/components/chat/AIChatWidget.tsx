import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Sparkles, Smartphone, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner@2.0.3";
import { sendChatbotMessage } from "../../api/chatbotApi";

interface Message {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;
  phoneRecommendations?: {
    id: string;
    name: string;
    brand: string;
    reason: string;
    link?: string;
  }[];
}

interface AIChatWidgetProps {
  onNavigate?: (phoneId: string) => void;
}

const CHATBOT_SESSION_KEY = "rtc_chatbot_session_id";

const getSessionId = () => {
  let sessionId = localStorage.getItem(CHATBOT_SESSION_KEY);
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CHATBOT_SESSION_KEY, sessionId);
  }
  return sessionId;
};

export default function AIChatWidget({ onNavigate }: AIChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Load messages from localStorage or use default welcome message
  const getInitialMessages = (): Message[] => {
    try {
      const stored = localStorage.getItem("aiChatMessages");
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.map((msg: Message) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }

    return [
      {
        id: "welcome",
        text: "Hi! I'm your AI phone assistant. I can help you find the perfect phone based on your needs. Just tell me what you're looking for!",
        sender: "ai",
        timestamp: new Date(),
      },
    ];
  };

  const [messages, setMessages] = useState<Message[]>(getInitialMessages());
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<{
    id: string;
    name: string;
    brand: string;
    reason: string;
    link?: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem("aiChatMessages", JSON.stringify(messages));
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendPresetPrompt = async (prompt: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      text: prompt,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const sessionId = getSessionId();
      const data = await sendChatbotMessage(sessionId, prompt);

      const userView = data.user_view || {};

      let aiText = userView.summary || "Here are some recommendations.";
      if (userView.questions?.length) {
        aiText += "\n\n" + userView.questions.map((q) => `• ${q}`).join("\n");
      }
      if (userView.suggestion) {
        aiText += `\n\n${userView.suggestion}`;
      }
      if (userView.next_step) {
        aiText += `\n\n${userView.next_step}`;
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: aiText,
        sender: "ai",
        timestamp: new Date(),
        phoneRecommendations: (userView.recommendations || []).map((rec) => ({
          id: rec.id,
          name: rec.model,
          brand: rec.brand,
          reason: (rec.why || []).join(", ") || "Recommended",
          link: rec.link,
        })),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      toast.error("Failed to get AI recommendations");
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: trimmed,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const sessionId = getSessionId();
      const data = await sendChatbotMessage(sessionId, trimmed);

      const userView = data.user_view || {};

      let aiText = userView.summary || "Here are some recommendations.";
      if (userView.questions && userView.questions.length > 0) {
        aiText += "\n\n" + userView.questions.map((q) => `• ${q}`).join("\n");
      }
      if (userView.suggestion) {
        aiText += `\n\n${userView.suggestion}`;
      }
      if (userView.next_step) {
        aiText += `\n\n${userView.next_step}`;
      }

      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        text: aiText,
        sender: "ai",
        timestamp: new Date(),
        phoneRecommendations: (userView.recommendations || []).map((rec) => ({
          id: rec.id,
          name: rec.model,
          brand: rec.brand,
          reason: (rec.why || []).join(", ") || "Recommended based on your preferences",
          link: rec.link,
        })),
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error: any) {
      console.error("Chatbot error:", error);
      toast.error("Failed to get AI recommendations");

      const errorMessage: Message = {
        id: `ai-error-${Date.now()}`,
        text: "Sorry — I couldn’t get recommendations right now. Please try again.",
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handlePhoneClick = (phoneId?: string) => {
    if (!phoneId) {
      toast.error("Phone ID missing");
      return;
    }

    if (onNavigate) {
      onNavigate(phoneId);
      setIsOpen(false); // Close chat so user sees the page
      setSelectedPhone(null);
    } else {
      window.location.href = `/phones/${phoneId}`;
    }
  };

  const handleWhyThisPhone = (phone: { name: string; brand: string; reason: string; link?: string }) => {
    setSelectedPhone(phone);
  };

  const handleClearChat = () => {
    // Resets the session key too
    localStorage.removeItem(CHATBOT_SESSION_KEY);

    const welcomeMessage: Message = {
      id: "welcome",
      text: "Hi! I'm your AI phone assistant. I can help you find the perfect phone based on your needs. Just tell me what you're looking for!",
      sender: "ai",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    toast.success("Chat history cleared");
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 left-6 z-50 bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all group animate-pulse-glow cursor-pointer"
          >
            <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
              <Sparkles size={12} />
            </div>
            {/* Tooltip */}
            <div className="absolute left-full ml-4 top-1/2 -translate-y-1/2 bg-[#1e1e1e] text-white px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none text-sm">
              Ask AI for phone recommendations
              <div className="absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-[#1e1e1e]"></div>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-6 z-50 w-[420px] h-[600px] bg-white dark:bg-[#161b26] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-[#e5e5e5] dark:border-[#2d3548]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5d8cf7] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-full p-2 backdrop-blur-sm">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 className="text-white">AI Phone Assistant</h3>
                  <p className="text-white/80 text-xs">Powered by AI recommendations</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all cursor-pointer"
                  title="Clear chat history"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f7f7f7] dark:bg-[#0d1117]">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.sender === "user"
                        ? "bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5d8cf7] text-white"
                        : "bg-white dark:bg-[#1a1f2e] border border-[#e5e5e5] dark:border-[#2d3548] text-[#1e1e1e] dark:text-white"
                    }`}
                  >
                    {message.sender === "ai" && (
                      <div className="flex items-center gap-2 mb-2">
                        <div className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5d8cf7] rounded-full p-1">
                          <Sparkles size={12} className="text-white" />
                        </div>
                        <span className="text-xs text-[#666] dark:text-[#a0a8b8]">AI Assistant</span>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{message.text}</p>

                    {/* Phone Recommendations */}
                    {message.phoneRecommendations && (
                      <div className="mt-3 space-y-2">
                        {message.phoneRecommendations.map((phone, idx) => (
                          <div
                            key={idx}
                            className="w-full bg-[#f7f7f7] dark:bg-[#161b26] border border-[#e5e5e5] dark:border-[#2d3548] rounded-lg p-3 transition-all"
                          >
                            <div className="flex items-start gap-3">
                              <div className="bg-gradient-to-br from-[#2c3968] to-[#3d4a7a] dark:from-[#4a7cf6] dark:to-[#5d8cf7] rounded-lg p-2 shrink-0">
                                <Smartphone size={16} className="text-white" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-[#1e1e1e] dark:text-white mb-1">
                                  {phone.brand} {phone.name}
                                </p>
                                <p className="text-xs text-[#666] dark:text-[#a0a8b8] leading-relaxed mb-3">
                                  {phone.reason}
                                </p>

                                <div className="flex gap-2 flex-wrap">
                                  <button
                                    onClick={() => handleWhyThisPhone(phone)}
                                    className="text-xs px-3 py-1.5 rounded-full bg-[#e9eefc] hover:bg-[#dbe5ff] text-[#2c3968] transition-all cursor-pointer"
                                  >
                                    Why this phone?
                                  </button>

                                  <button
                                    onClick={() => handlePhoneClick(phone.id)} // Change from phone.link to phone.id
                                    className="text-xs px-3 py-1.5 rounded-full bg-[#2c3968] hover:bg-[#24315a] text-white transition-all cursor-pointer"
                                  >
                                    View page
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-xs mt-2 opacity-50">
                      {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-[#1a1f2e] border border-[#e5e5e5] dark:border-[#2d3548] rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div
                          className="w-2 h-2 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-[#2c3968] dark:bg-[#4a7cf6] rounded-full animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></div>
                      </div>
                      <span className="text-xs text-[#666] dark:text-[#a0a8b8]">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-[#161b26] border-t border-[#e5e5e5] dark:border-[#2d3548] p-4">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask for phone recommendations..."
                  className="flex-1 px-4 py-3 rounded-xl border border-[#d9d9d9] dark:border-[#2d3548] bg-white dark:bg-[#0d1117] text-[#1e1e1e] dark:text-white focus:border-[#2c3968] dark:focus:border-[#4a7cf6] focus:outline-none focus:ring-2 focus:ring-[#2c3968]/20 transition-all text-sm"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white rounded-xl px-4 py-3 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  onClick={() => sendPresetPrompt("Best camera phones")}
                  className="text-xs px-3 py-1.5 bg-[#f7f7f7] dark:bg-[#1a1f2e] hover:bg-[#ececec] dark:hover:bg-[#2d3548] rounded-full text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-all cursor-pointer"
                  disabled={isTyping}
                >
                  📸 Camera
                </button>

                <button
                  onClick={() => sendPresetPrompt("Gaming phones")}
                  className="text-xs px-3 py-1.5 bg-[#f7f7f7] dark:bg-[#1a1f2e] hover:bg-[#ececec] dark:hover:bg-[#2d3548] rounded-full text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-all cursor-pointer"
                  disabled={isTyping}
                >
                  🎮 Gaming
                </button>

                <button
                  onClick={() => sendPresetPrompt("Long battery life")}
                  className="text-xs px-3 py-1.5 bg-[#f7f7f7] dark:bg-[#1a1f2e] hover:bg-[#ececec] dark:hover:bg-[#2d3548] rounded-full text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-all cursor-pointer"
                  disabled={isTyping}
                >
                  🔋 Battery
                </button>

                <button
                  onClick={() => sendPresetPrompt("Budget phones")}
                  className="text-xs px-3 py-1.5 bg-[#f7f7f7] dark:bg-[#1a1f2e] hover:bg-[#ececec] dark:hover:bg-[#2d3548] rounded-full text-[#666] dark:text-[#a0a8b8] hover:text-[#2c3968] dark:hover:text-[#4a7cf6] transition-all cursor-pointer"
                  disabled={isTyping}
                >
                  💰 Budget
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {selectedPhone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhone(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="w-full max-w-md bg-white dark:bg-[#161b26] rounded-2xl shadow-2xl border border-[#e5e5e5] dark:border-[#2d3548] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white">
                    {selectedPhone.brand} {selectedPhone.name}
                  </h3>
                  <p className="text-white/80 text-sm">Recommendation Details</p>
                </div>
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg p-2 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-sm text-[#666] dark:text-[#a0a8b8] mb-2">Why this phone?</p>
                  <div className="bg-[#f7f7f7] dark:bg-[#0d1117] border border-[#e5e5e5] dark:border-[#2d3548] rounded-xl p-4 text-sm text-[#1e1e1e] dark:text-white leading-relaxed">
                    {selectedPhone.reason}
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setSelectedPhone(null)}
                    className="px-4 py-2 rounded-lg border border-[#d9d9d9] dark:border-[#2d3548] text-[#666] dark:text-[#a0a8b8] hover:bg-[#f7f7f7] dark:hover:bg-[#1a1f2e] transition-all cursor-pointer"
                  >
                    Close
                  </button>

                  {selectedPhone.id && (
                    <button
                      onClick={() => handlePhoneClick(selectedPhone.id)}
                      className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#2c3968] to-[#3d4a7a] text-white hover:shadow-lg transition-all cursor-pointer"
                    >
                      Open phone page
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
