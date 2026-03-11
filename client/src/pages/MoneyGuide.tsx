import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Send, Loader2, Sparkles, Lightbulb, Target, PiggyBank,
  TrendingUp, HelpCircle, RotateCcw, Bot, User as UserIcon
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  { label: "How do I start saving?", icon: PiggyBank, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800" },
  { label: "What are stocks?", icon: TrendingUp, color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { label: "Help me set a savings goal", icon: Target, color: "bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800" },
  { label: "What's compound interest?", icon: Lightbulb, color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { label: "Needs vs wants — explain!", icon: HelpCircle, color: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800" },
  { label: "Give me a money challenge!", icon: Sparkles, color: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800" },
];

export default function MoneyGuide() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: content.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch("/api/guide/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.content) {
                    fullContent += data.content;
                    setMessages(prev => {
                      const updated = [...prev];
                      updated[updated.length - 1] = { role: "assistant", content: fullContent };
                      return updated;
                    });
                  }
                  if (data.error) throw new Error(data.error);
                } catch (e) {
                  if (e instanceof SyntaxError) continue;
                  throw e;
                }
              }
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Oops! I had a little hiccup. Try asking me again! 🤔",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const resetChat = () => {
    setMessages([]);
    setInput("");
  };

  const userName = user?.firstName || "friend";

  return (
    <div className="flex min-h-screen caribbean-bg">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen p-4 lg:p-6">
        <div className="glass-card-heavy rounded-glass flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200/60 p-4 lg:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-300/50 dark:shadow-purple-900/50">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display text-xl lg:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500" data-testid="text-guide-title">
                Money Guide
              </h1>
              <p className="text-xs text-gray-500 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Your AI money mentor
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetChat}
              className="rounded-2xl border-2 gap-1 font-semibold"
              data-testid="button-new-chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Chat
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4" data-testid="chat-messages">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-8">
              <div className="text-center space-y-4">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-pink-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-300/50 dark:shadow-purple-900/50 animate-float">
                  <span className="text-5xl">🧠</span>
                </div>
                <h2 className="text-2xl lg:text-3xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-violet-600 to-pink-500">
                  Hey {userName}! 👋
                </h2>
                <p className="text-gray-600 max-w-md mx-auto font-medium">
                  I'm your Money Guide — ask me anything about saving, budgeting, investing, or money in general. No question is too simple!
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl w-full">
                {QUICK_PROMPTS.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(prompt.label)}
                    className={`glass-card flex items-center gap-3 p-4 rounded-glass text-left transition-all hover:scale-[1.02] hover:shadow-md ${prompt.color}`}
                    data-testid={`button-quick-prompt-${i}`}
                  >
                    <prompt.icon className="w-5 h-5 shrink-0" />
                    <span className="text-sm font-semibold">{prompt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`chat-message-${i}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-white shrink-0 shadow-md mt-1">
                      <Bot className="w-4.5 h-4.5" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 text-white shadow-lg"
                        : "glass-card rounded-glass border-0 shadow-md"
                    }`}
                  >
                    {msg.role === "assistant" && msg.content === "" && isStreaming ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Thinking...</span>
                      </div>
                    ) : (
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 shadow-md mt-1">
                      <UserIcon className="w-4.5 h-4.5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="border-t border-gray-200/60 p-4 lg:p-6">
          <form onSubmit={handleSubmit} className="flex gap-3 max-w-3xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about money..."
              disabled={isStreaming}
              className="flex-1 rounded-2xl border border-white/50 bg-white/50 backdrop-blur-sm text-gray-800 px-4 py-3 text-sm font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400 disabled:opacity-50"
              data-testid="input-chat"
            />
            <Button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="rounded-2xl px-5 bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 hover:from-violet-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-300/50 dark:shadow-purple-900/50 transition-all hover:scale-105"
              data-testid="button-send"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
          <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">
            Money Guide gives educational info only — not real financial advice!
          </p>
        </div>
        </div>
      </main>
    </div>
  );
}
