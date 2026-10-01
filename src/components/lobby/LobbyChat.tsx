"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendLobbyMessageAction } from "@/app/lobby/[id]/actions";
import { Send, Shield, MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface LobbyChatProps {
  lobbyId: string;
  currentUserId: string;
  initialMessages?: ChatMessage[];
}

export function LobbyChat({
  lobbyId,
  currentUserId,
  initialMessages = [],
}: LobbyChatProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputContent, setInputContent] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new message
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to Supabase Realtime for this lobby
  useEffect(() => {
    const channel = supabase
      .channel(`lobby-chat:${lobbyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "lobby_messages",
          filter: `lobby_id=eq.${lobbyId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [lobbyId, supabase]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputContent.trim();
    if (!trimmed || sending) return;

    setSending(true);

    try {
      const res = await sendLobbyMessageAction(lobbyId, trimmed);
      if (res.success && res.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === res.message.id)) return prev;
          return [...prev, res.message as ChatMessage];
        });
      }
      setInputContent("");
    } catch (err) {
      console.error("Failed to send chat message:", err);
    } finally {
      setSending(false);
    }
  };

  const renderContent = (content: string) => {
    if (content.includes("[blocked by VaultTrade]")) {
      const parts = content.split("[blocked by VaultTrade]");
      return (
        <span>
          {parts.map((part, index) => (
            <span key={index}>
              {part}
              {index < parts.length - 1 && (
                <span className="text-danger font-semibold bg-danger-muted/30 px-1 py-0.5 rounded text-[11px]">
                  [blocked by VaultTrade]
                </span>
              )}
            </span>
          ))}
        </span>
      );
    }
    return <span>{content}</span>;
  };

  return (
    <div className="card-surface flex flex-col h-[520px] overflow-hidden">
      {/* Chat Header */}
      <div className="p-3.5 border-b border-border-subtle flex items-center justify-between bg-bg-surface">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Protected Lobby Chat
          </h4>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-text-muted">
          <Shield className="w-3 h-3 text-accent" />
          <span>Sanitized & Logged</span>
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-bg-inset/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <p className="text-xs text-text-muted">
              Secure in-app communication. Phone numbers, WhatsApp handles, and external links are automatically redacted.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2 text-xs leading-relaxed ${
                    isMe
                      ? "bg-accent-muted text-text-primary rounded-2xl rounded-tr-sm border border-accent/30"
                      : "bg-bg-elevated text-text-primary rounded-2xl rounded-tl-sm border border-border-default"
                  }`}
                >
                  {renderContent(msg.content)}
                </div>
                <span className="text-[10px] text-text-muted mt-1 px-1 font-mono">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Chat Input */}
      <form
        onSubmit={handleSendMessage}
        className="p-3 border-t border-border-subtle bg-bg-surface flex items-center gap-2"
      >
        <input
          type="text"
          placeholder="Type message here..."
          value={inputContent}
          onChange={(e) => setInputContent(e.target.value)}
          className="flex-1 h-9 input-inset px-3 text-xs"
        />
        <button
          type="submit"
          disabled={sending || !inputContent.trim()}
          className="btn-primary h-9 px-3 text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
