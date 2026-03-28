import { useEffect, useRef, useState } from "react";
import { streamAgent } from "../api/client";
import { ModelSelector } from "../components/ModelSelector";
import { cn } from "../lib/utils";
import { ArrowUp, Bot, Wrench, User } from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AgentShowcase } from "../components/AgentShowcase";

interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
}

let msgId = 0;
function nextId() {
  return `msg-${++msgId}`;
}

export function ChatView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const send = (text?: string) => {
    const query = (text ?? input).trim();
    if (!query || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { id: nextId(), role: "user", content: query }]);
    setLoading(true);

    let assistantText = "";

    const controller = streamAgent(
      query,
      (event, data) => {
        if (event === "tool_start") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "tool", content: `Using ${data.tool}...` },
          ]);
        } else if (event === "tool_end") {
          setMessages((prev) => {
            const updated = [...prev];
            const lastTool = updated.findLastIndex((m) => m.role === "tool");
            if (lastTool >= 0) {
              updated[lastTool] = {
                ...updated[lastTool],
                content: `${data.tool} (${data.duration}ms)`,
              };
            }
            return updated;
          });
        } else if (event === "done") {
          assistantText = data.answer ?? assistantText;
          setMessages((prev) => [...prev, { id: nextId(), role: "assistant", content: assistantText }]);
          setLoading(false);
        } else if (event === "result") {
          if (!assistantText) {
            assistantText = data.answer ?? "";
            setMessages((prev) => [
              ...prev,
              { id: nextId(), role: "assistant", content: assistantText },
            ]);
          }
          setLoading(false);
        } else if (event === "error") {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: `Error: ${data.error}` },
          ]);
          setLoading(false);
        }
      },
      "dashboard",
      model || undefined
    );

    abortRef.current = controller;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="relative flex flex-col h-full">
      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className={cn("mx-auto max-w-2xl px-4", messages.length > 0 ? "pt-6 pb-52" : "pt-0 pb-0")}>
          {/* Empty state — agent showcase */}
          {messages.length === 0 && <AgentShowcase onSend={send} />}

          {/* Message list */}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-6">
              {msg.role === "user" && (
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-card shadow-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 pt-0.5 text-sm leading-relaxed text-foreground">
                    {msg.content}
                  </div>
                </div>
              )}

              {msg.role === "assistant" && (
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 pt-0.5 text-sm leading-relaxed prose prose-sm prose-invert max-w-none break-words">
                    <Markdown remarkPlugins={[remarkGfm]}>{msg.content}</Markdown>
                  </div>
                </div>
              )}

              {msg.role === "tool" && (
                <div className="flex items-center gap-2 ml-10 text-xs text-muted-foreground">
                  <Wrench className="h-3 w-3" />
                  {msg.content}
                </div>
              )}
            </div>
          ))}

          {/* Thinking indicator */}
          {loading && (
            <div className="flex items-start gap-3 mb-6">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5 pt-1.5">
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse" />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-primary/60 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input area — fixed at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background from-60% to-transparent pt-10 pb-4">
        <div className="mx-auto max-w-2xl px-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-xl border border-border bg-card shadow-lg">
              <TextareaAutosize
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Dexter anything..."
                disabled={loading}
                maxRows={6}
                className="w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <div className="flex items-center justify-between px-3 pb-2">
                <ModelSelector value={model} onChange={setModel} />
                <button
                  type="button"
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                    input.trim() && !loading
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  )}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Dexter can make mistakes. Verify important financial information.
          </p>
        </div>
      </div>
    </div>
  );
}
