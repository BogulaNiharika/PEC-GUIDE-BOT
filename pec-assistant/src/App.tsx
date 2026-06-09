import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Copy,
  Check,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Award,
  ChevronRight,
  GraduationCap,
  Building2,
  Clock,
  BookOpen,
  Trophy,
  Volume2,
  VolumeX,
  Compass
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// 2025 Placements highlight details
const PLACEMENTS_HIGHLIGHTS = [
  { package: "40 LPA", count: "2 Students" },
  { package: "29 LPA", count: "3 Students" },
  { package: "11 LPA", count: "3 Students" },
  { package: "6.0 LPA", count: "51 Students" },
  { package: "5.5 LPA", count: "267 Students" },
  { package: "3.6 LPA", count: "109 Students" }
];

// Quick query suggestions
const SUGGESTED_QUERIES = [
  { id: "1", label: "Cutoff & EAPCET Code", prompt: "What is the EAPCET counselling code for Pragati Engineering College and what is the cutoff?" },
  { id: "2", label: "2025 Placement Highlights", prompt: "Show me the 2025 placement highlights and packages at PEC." },
  { id: "3", label: "B.Tech CSE & AI programs", prompt: "What CSE and AI/ML programs does Pragati Engineering College offer?" },
  { id: "4", label: "Admissions Eligibility", prompt: "What is the eligibility criteria for joining B.Tech at Pragati?" },
  { id: "5", label: "Achievements & Credentials", prompt: "Tell me about PEC's achievements, certifications, and Eduskills awards." },
  { id: "6", label: "Campus Life & Clubs", prompt: "What sports facilities and student clubs exist on campus?" }
];

// College Departments
const DEPARTMENTS = [
  { code: "CSE", name: "Computer Science & Eng" },
  { code: "AI&ML", name: "CSE - AI & ML" },
  { code: "DS", name: "CSE - Data Science" },
  { code: "ECE", name: "Electronics & Comm" },
  { code: "EEE", name: "Electrical & Electronics" },
  { code: "ME", name: "Mechanical Engineering" },
  { code: "CIVIL", name: "Civil Engineering" },
  { code: "IT", name: "Information Technology" }
];

// Formatting helper to parse Markdown-like syntax into clean HTML (bold, links, lists)
function renderMarkdown(text: string) {
  // 1. Escaping HTML characters to prevent XSS
  let escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // 1.5 Parse lines starting with "════" or "----" as custom separator dividers
  escaped = escaped.replace(/^(?:═════+|----+)\s*$/gm, '<div class="border-t border-slate-200/80 my-3"></div>');

  // 2. Parse bold (**text**)
  escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>');

  // 3. Parse URLs ending in bracket links [Label](url) or naked https:// URLs
  // Match [text](url)
  escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">$1 <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>');
  
  // Match naked links
  escaped = escaped.replace(/(?<!href=")(?<!">)(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">$1 <svg class="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg></a>');

  // 4. Parse custom arrows (→)
  escaped = escaped.replace(/→/g, '<span class="text-blue-500 font-bold">➔</span>');

  // 5. Parse line breaks/bullet points
  const lines = escaped.split("\n");
  const processedLines = lines.map(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("➔")) {
      const bulletContent = trimmed.substring(1).trim();
      return `<li class="ml-4 list-disc text-slate-700 my-1">${bulletContent}</li>`;
    }
    // Numbered lists
    const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
    if (numMatch) {
      return `<li class="ml-4 list-decimal text-slate-700 my-1">${numMatch[2]}</li>`;
    }
    return line ? `<p class="my-1.5 leading-relaxed text-slate-700">${line}</p>` : '<div class="h-1.5"></div>';
  });

  return processedLines.join("");
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load message history & time
  useEffect(() => {
    // Local storage persistence
    const savedMessages = localStorage.getItem("pec_chat_history");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse local history:", e);
      }
    } else {
      // Default welcome message
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Hello! Welcome to Pragati Engineering College. How can I assist you today? 😊",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }

    // Capture browser speechSynthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      speechSynthRef.current = window.speechSynthesis;
    }

    // Live clock update
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  // Save history on change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem("pec_chat_history", JSON.stringify(messages));
    }
  }, [messages]);

  // Handle autoscroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Handle voice synthesis offline helper
  const handleToggleSpeech = (msgId: string, text: string) => {
    if (!speechSynthRef.current) return;

    if (speakingId === msgId) {
      speechSynthRef.current.cancel();
      setSpeakingId(null);
      return;
    }

    // Stop current
    speechSynthRef.current.cancel();

    // Clean markdown characters from synthesis text
    const cleanText = text
      .replace(/\*\*/g, "")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "link")
      .replace(/[║═➔●→•-]/g, " ");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeakingId(null);
    };
    utterance.onerror = () => {
      setSpeakingId(null);
    };

    currentUtteranceRef.current = utterance;
    setSpeakingId(msgId);
    speechSynthRef.current.speak(utterance);
  };

  // Submit main inquiry
  const handleSubmitPrompt = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Add user message to UI
    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    // Cancel any current text speech
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setSpeakingId(null);
    }

    try {
      const historyPayload = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyPayload })
      });

      if (!res.ok) {
        throw new Error("Oops! The database or server had an issue answering this inquiry.");
      }

      const data = await res.json();

      setMessages(prev => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: "assistant",
          content: data.text || "I apologize, I didn't receive a valid statement. How can I expand on Pragati Engineering College for you?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "I apologized, but I'm having difficulties connecting to my college core right now. Please get in touch with us at **pragati@pragati.ac.in** or dial **+91 7330826667** for instant support!",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear conversation state
  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear your conversation history?")) {
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
        setSpeakingId(null);
      }
      const initialWelcome: Message[] = [
        {
          id: "welcome-reset",
          role: "assistant",
          content: "Hello! Welcome to Pragati Engineering College. How can I assist you today? 😊",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
      setMessages(initialWelcome);
      localStorage.setItem("pec_chat_history", JSON.stringify(initialWelcome));
    }
  };

  // Copy message text helper
  const handleCopyText = (msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Upper Brand Bar */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md border-b-4 border-amber-400">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-full shadow-inner border border-amber-300">
              {/* Artistic Academic Crest Emblem Placeholder */}
              <div className="w-10 h-10 rounded-full bg-blue-900 border border-blue-950 flex items-center justify-center font-display font-bold text-lg text-amber-400 tracking-wider">
                PEC
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-xl tracking-tight text-white">
                  Pragati Engineering College
                </h1>
                <span className="bg-amber-400 text-blue-950 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                  NAAC A+
                </span>
              </div>
              <p className="text-xs text-blue-200 font-medium">
                Approved by AICTE | Accredited by NBA | Estd. 2001
              </p>
            </div>
          </div>

          {/* Quick Header Accoutrements */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 bg-blue-950/45 px-3 py-1.5 rounded-full border border-blue-700 text-blue-200">
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>IST: {currentTime || "15:04:44"}</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-950/45 px-3 py-1.5 rounded-full border border-blue-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-emerald-300 font-semibold uppercase tracking-wider text-[11px]">Online</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Responsive Split Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden">
        
        {/* Left Column: Interactive Chat (Chatbot takes up the key visual priority) */}
        <section id="chat-section" className="lg:col-span-8 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden h-[780px] lg:h-[820px]">
          
          {/* Chat Window Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-blue-100 text-blue-900 p-1.5 rounded-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-slate-800">PEC AI Assistant</h2>
                <p className="text-[11px] text-slate-500">Official Campus AI Companion</p>
              </div>
            </div>

            <button
              id="clear-chat-btn"
              onClick={handleClearChat}
              className="flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors py-1 px-2.5 rounded-lg hover:bg-red-50 text-xs font-medium"
              title="Clear entire conversation"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>

          {/* Scrollable Messages Stream */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 bg-slate-50/50">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  id={`msg-${msg.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-3 max-w-[85%] ${
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  }`}
                >
                  {/* Left Avatar Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white" 
                      : "bg-blue-900 text-amber-300"
                  }`}>
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>

                  {/* Message Bubble Container */}
                  <div className="space-y-1">
                    <div className={`p-4 rounded-2xl shadow-sm border ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white border-indigo-700 rounded-tr-none"
                        : "bg-white text-slate-800 border-slate-200 rounded-tl-none"
                    }`}>
                      {msg.role === "user" ? (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div 
                          className="text-sm prose prose-sm max-w-none space-y-2 text-slate-800"
                          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                        />
                      )}
                    </div>

                    {/* Metadata Actions (Copy & TTS) */}
                    <div className={`flex items-center gap-3 text-[10px] text-slate-400 px-1 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}>
                      <span>{msg.timestamp}</span>
                      
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2">
                          {/* Copy trigger */}
                          <button
                            id={`copy-btn-${msg.id}`}
                            onClick={() => handleCopyText(msg.id, msg.content)}
                            className="hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                            title="Copy response text"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>

                          {/* Speak trigger */}
                          <button
                            id={`speak-btn-${msg.id}`}
                            onClick={() => handleToggleSpeech(msg.id, msg.content)}
                            className="hover:text-slate-700 transition-colors p-0.5 rounded cursor-pointer"
                            title="Toggle voice readout"
                          >
                            {speakingId === msg.id ? (
                              <VolumeX className="w-3 h-3 text-amber-500 animate-pulse" />
                            ) : (
                              <Volume2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* AI Typing Loader Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 max-w-[80%] mr-auto"
                id="bot-loading-indicator"
              >
                <div className="w-8 h-8 rounded-full bg-blue-900 text-amber-300 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-white text-slate-700 border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 self-start">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                  </div>
                  <span className="text-xs text-slate-400 font-medium">Assistant analyzing campus guidelines...</span>
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick interactive suggestions */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 overflow-x-auto">
            <div className="flex gap-2 whitespace-nowrap pb-1">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q.id}
                  id={`suggestion-chip-${q.id}`}
                  onClick={() => handleSubmitPrompt(q.prompt)}
                  className="bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-900 border border-slate-200 hover:border-blue-300 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input field controls */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <form
              id="chat-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmitPrompt(inputValue);
              }}
              className="flex items-center gap-2"
            >
              <input
                id="chat-text-input"
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask PEC Assistant (English or తెలుగు - e.g., 'cutoff', 'placements')..."
                className="flex-1 bg-slate-100 border border-slate-200 hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all text-slate-800 font-medium placeholder:text-slate-400"
                disabled={isLoading}
              />
              <button
                id="chat-submit-btn"
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="bg-blue-900 hover:bg-blue-800 disabled:bg-slate-200 text-white disabled:text-slate-400 p-3 rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center cursor-pointer transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
                title="Send inquiry"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Dynamic Bento Information Directory */}
        <section id="info-directory" className="lg:col-span-4 space-y-6 overflow-y-auto max-h-[820px] pr-1">
          
          {/* Key Credentials Card */}
          <div className="bg-gradient-to-br from-blue-900 to-indigo-950 text-white p-5 rounded-2xl shadow-sm border border-indigo-950 flex flex-col justify-between relative overflow-hidden group">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full blur-2xl -mr-8 -mt-8"></div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-amber-400 text-blue-950 p-2 rounded-xl font-bold shadow">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-amber-300">Entrance Codes</span>
              </div>
              <h3 className="font-display font-bold text-lg text-amber-300">Prestige & Counselling</h3>
              <p className="text-xs text-blue-100 mt-2 leading-relaxed">
                Pragati Engineering College stands as a hallmark of premium engineering. Use code <strong className="text-white font-mono bg-blue-950/80 px-1.5 py-0.5 rounded border border-blue-800">PRAG</strong> during counsellings.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                <span className="text-[10px] text-blue-200 block">EAPCET & ECET</span>
                <span className="font-mono font-bold text-sm text-yellow-300 block mt-0.5">PRAG</span>
              </div>
              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 text-center">
                <span className="text-[10px] text-blue-200 block">PGCET / GATE</span>
                <span className="font-mono font-bold text-sm text-yellow-300 block mt-0.5">PRAG1</span>
              </div>
            </div>
          </div>

          {/* Placement Certifications Bento Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                <h3 className="font-display font-bold text-sm text-slate-800">2025 Placings & CDC</h3>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100">
                1347+ Placed
              </span>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Career Development Centre (CDC) delivers outstanding corporate results. High packages of <strong className="text-indigo-950 font-bold">40 LPA</strong> and <strong className="text-indigo-950 font-bold">29 LPA</strong>.
            </p>

            <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
              {PLACEMENTS_HIGHLIGHTS.map((p, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-xl text-xs hover:border-amber-300 transition-all">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    <span className="font-semibold text-slate-700">{p.package} Package</span>
                  </div>
                  <span className="font-mono text-slate-400 font-medium">{p.count}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <a
                href="https://pragati.ac.in/placements"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 group"
              >
                <span>Full placement details</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </a>
            </div>
          </div>

          {/* interactive B.Tech Departments Card */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-3.5">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <h3 className="font-display font-bold text-sm text-slate-800">Academics & Branches</h3>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Click on any engineering branch shortcut below to instantly query our assistant for its curriculum details and seat counts!
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept.code}
                  id={`dept-shortcut-${dept.code}`}
                  onClick={() => handleSubmitPrompt(`Tell me details about B.Tech ${dept.name} (${dept.code}) department at Pragati.`)}
                  className="bg-slate-50 hover:bg-blue-50 border border-slate-200/85 hover:border-blue-300 p-2.5 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="font-mono text-xs font-bold text-slate-800 group-hover:text-blue-900 block">{dept.code}</span>
                  <span className="text-[10px] text-slate-400 group-hover:text-blue-600 font-medium truncate block">{dept.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links Directory and Credentials */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Compass className="w-4 h-4 text-teal-600" />
              <h3 className="font-display font-bold text-sm text-slate-800">Useful Directory Links</h3>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <a
                href="https://admission.pragati.ac.in"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100/80 rounded-xl text-xs text-slate-700 hover:text-slate-900 transition-all font-semibold"
              >
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-500" />
                  <span>Admissions Portal</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="https://mypec.app"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100/80 rounded-xl text-xs text-slate-700 hover:text-slate-900 transition-all font-semibold"
              >
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>mypec.app Student Portal</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>

              <a
                href="https://pragati.ac.in/examination/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-100/80 rounded-xl text-xs text-slate-700 hover:text-slate-900 transition-all font-semibold"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-emerald-500" />
                  <span>Examinations Branch</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            </div>
          </div>

          {/* Contact Details Card */}
          <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200/80 space-y-3.5">
            <h4 className="font-display font-bold text-xs text-slate-700 uppercase tracking-wider">Official Contacts</h4>
            
            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  3-180, ADB Road, Surampalem, Near Peddapuram, Kakinada Dist, AP - 533437
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <div>
                  <a href="tel:+917330826667" className="hover:underline font-semibold block text-slate-800">+91 7330826667</a>
                  <a href="tel:08852252233" className="hover:underline font-mono text-[11px] block">08852 252233</a>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <a href="mailto:pragati@pragati.ac.in" className="hover:underline text-slate-800 font-semibold break-all">
                  pragati@pragati.ac.in
                </a>
              </div>
            </div>

            {/* Social media connections */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">PEC Social Channels</span>
              <div className="flex items-center gap-2">
                <a href="https://www.facebook.com/PragatiEngineeeringCollege/" target="_blank" rel="noopener noreferrer" className="bg-white p-1 rounded-md text-slate-500 hover:text-blue-600 shadow-sm border border-slate-200 text-xs font-bold" title="Facebook">FB</a>
                <a href="https://www.instagram.com/pragatiengineering/" target="_blank" rel="noopener noreferrer" className="bg-white p-1 rounded-md text-slate-500 hover:text-pink-600 shadow-sm border border-slate-200 text-xs font-bold" title="Instagram">IG</a>
                <a href="https://in.linkedin.com/company/pragati-engineering-college" target="_blank" rel="noopener noreferrer" className="bg-white p-1 rounded-md text-slate-500 hover:text-blue-700 shadow-sm border border-slate-200 text-xs font-bold" title="LinkedIn">LN</a>
                <a href="https://www.youtube.com/pragatiengineeringcollege" target="_blank" rel="noopener noreferrer" className="bg-white p-1 rounded-md text-slate-500 hover:text-red-600 shadow-sm border border-slate-200 text-xs font-bold" title="YouTube">YT</a>
              </div>
            </div>
          </div>

        </section>

      </main>

      {/* Elegant Academic Footer */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-4 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p>© {new Date().getFullYear()} Pragati Engineering College (Autonomous). All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://pragati.ac.in" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Official Website</a>
            <span>•</span>
            <a href="https://mypec.app" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">mypec Portal</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
