"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  Lock,
  Send,
  X,
  Search,
  MessageSquare,
  User,
  Plus,
  Loader2,
  Check,
  CheckCheck,
  Sparkles,
  ArrowLeft,
  GraduationCap,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { deriveConversationKey, encryptMessage, decryptMessage } from "@/lib/crypto";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

interface ChatDrawerProps {
  currentUser: {
    id: string;
    name?: string;
    email?: string;
    role?: string;
  };
  initialRecipientId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function EncryptedChatDrawer({
  currentUser,
  initialRecipientId,
  isOpen,
  onClose,
}: ChatDrawerProps) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [decryptedMap, setDecryptedMap] = useState<{ [msgId: string]: string }>({});
  const [contacts, setContacts] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showContactsList, setShowContactsList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCryptoKey, setActiveCryptoKey] = useState<CryptoKey | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of message list
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch all user conversations
  const fetchConversations = async () => {
    try {
      setLoadingConversations(true);
      const res = await fetch("/api/chat?action=conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    } finally {
      setLoadingConversations(false);
    }
  };

  // Fetch available contacts (tutors/students)
  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/chat?action=contacts");
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchConversations();
      fetchContacts();
    }
  }, [isOpen]);

  // Open direct chat if initialRecipientId is passed
  useEffect(() => {
    if (isOpen && initialRecipientId && contacts.length > 0) {
      handleStartConversationWith(initialRecipientId);
    }
  }, [isOpen, initialRecipientId, contacts]);

  // Real-time synchronization
  useRealtimeSync({
    events: ["CHAT_MESSAGE"],
    onSync: (payload) => {
      fetchConversations();
      if (activeConversation && payload?.data?.conversationId === activeConversation.id) {
        fetchMessages(activeConversation.id, activeConversation.otherUser);
      }
    },
  });

  // Fetch and decrypt messages for a conversation
  const fetchMessages = async (convId: string, otherUser: any) => {
    try {
      setLoadingMessages(true);
      const res = await fetch(`/api/chat?action=messages&conversationId=${convId}`);
      if (res.ok) {
        const data = await res.json();
        const rawMessages = data.messages || [];
        setMessages(rawMessages);

        // Derive E2EE Key client-side
        const key = await deriveConversationKey(currentUser.id, otherUser.id);
        setActiveCryptoKey(key);

        // Decrypt all messages client-side
        const decMap: { [msgId: string]: string } = {};
        for (const msg of rawMessages) {
          if (msg.encryptedContent && msg.iv) {
            decMap[msg.id] = await decryptMessage(msg.encryptedContent, msg.iv, key);
          } else {
            decMap[msg.id] = "[Encrypted Payload]";
          }
        }
        setDecryptedMap(decMap);
        setTimeout(scrollToBottom, 50);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Select active conversation
  const handleSelectConversation = (conv: any) => {
    setActiveConversation(conv);
    setShowContactsList(false);
    fetchMessages(conv.id, conv.otherUser);
  };

  // Start or open conversation with a contact
  const handleStartConversationWith = async (contactId: string) => {
    try {
      setLoadingMessages(true);
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_or_create_conversation",
          recipientId: contactId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const conv = data.conversation;
        setActiveConversation(conv);
        setShowContactsList(false);
        await fetchMessages(conv.id, conv.otherUser);
        await fetchConversations();
      }
    } catch (err) {
      console.error("Error starting conversation:", err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Send End-to-End Encrypted Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConversation || !activeCryptoKey) return;

    const plainText = inputText.trim();
    setInputText("");

    try {
      setIsSending(true);

      // 1. Client-Side Encryption with AES-GCM 256-bit
      const { encryptedContent, iv } = await encryptMessage(plainText, activeCryptoKey);

      // 2. Transmit Ciphertext & IV to Server (Zero-Knowledge)
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_message",
          conversationId: activeConversation.id,
          receiverId: activeConversation.otherUser.id,
          encryptedContent,
          iv,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const newMsg = data.message;
        setMessages((prev) => [...prev, newMsg]);
        setDecryptedMap((prev) => ({ ...prev, [newMsg.id]: plainText }));
        setTimeout(scrollToBottom, 50);
        fetchConversations();
      }
    } catch (err) {
      console.error("Error sending encrypted message:", err);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  if (!isOpen) return null;

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.headline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300">
        
        {/* Top App Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-white">
                  Academic Encrypted Chat
                </h3>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] font-bold gap-1 flex items-center">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>AES-256 E2EE</span>
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Direct secure student & tutor communication channel
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close Chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT SIDEBAR: Conversations & Contact List */}
          <div
            className={`w-full sm:w-72 border-r border-slate-200 bg-slate-50 flex flex-col ${
              activeConversation ? "hidden sm:flex" : "flex"
            }`}
          >
            {/* Search & Actions Bar */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  placeholder="Search chats or faculty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-slate-50 border-slate-200"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {showContactsList ? "Available Contacts" : "Recent Conversations"}
                </span>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowContactsList(!showContactsList)}
                  className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                >
                  {showContactsList ? "View Chats" : "+ New Chat"}
                </Button>
              </div>
            </div>

            {/* Conversation / Contacts Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {showContactsList ? (
                // 1. New Chat Contacts Directory
                filteredContacts.length > 0 ? (
                  filteredContacts.map((contact) => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartConversationWith(contact.id)}
                      className="p-3 flex items-center justify-between gap-3 hover:bg-blue-50/60 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="w-8 h-8 ring-1 ring-slate-200">
                          <AvatarImage src={contact.avatar} />
                          <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                            {contact.name?.substring(0, 2).toUpperCase() || "AC"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-900 truncate">
                            {contact.name}
                          </h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {contact.headline || (contact.role === "INSTRUCTOR" ? "Faculty Tutor" : "Scholar")}
                          </p>
                        </div>
                      </div>

                      <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                        Start
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center space-y-1 text-xs text-slate-400">
                    <Users className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <p className="font-bold text-slate-600">No contacts found</p>
                  </div>
                )
              ) : (
                // 2. Active Conversations List
                filteredConversations.length > 0 ? (
                  filteredConversations.map((conv) => {
                    const isSelected = activeConversation?.id === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={`p-3 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-100/70 border-l-4 border-blue-600"
                            : "hover:bg-slate-100/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="w-8 h-8 ring-1 ring-slate-200">
                            <AvatarImage src={conv.otherUser?.avatar} />
                            <AvatarFallback className="bg-slate-200 text-slate-700 font-bold text-xs">
                              {conv.otherUser?.name?.substring(0, 2).toUpperCase() || "US"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <h4 className="font-bold text-xs text-slate-900 truncate">
                              {conv.otherUser?.name}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                              <span>End-to-End Encrypted</span>
                            </p>
                          </div>
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-8 text-center space-y-2 text-xs text-slate-400">
                    <MessageSquare className="w-6 h-6 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600">No Conversations</p>
                    <p className="text-[11px] text-slate-400">
                      Click &quot;+ New Chat&quot; to message your tutor or student.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setShowContactsList(true)}
                      className="text-xs font-bold bg-blue-600 text-white rounded-xl"
                    >
                      + Start Conversation
                    </Button>
                  </div>
                )
              )}
            </div>
          </div>

          {/* RIGHT PANE: Active Chat Conversation */}
          <div className={`flex-1 flex flex-col bg-slate-50/50 ${!activeConversation ? "hidden sm:flex" : "flex"}`}>
            {activeConversation ? (
              <>
                {/* Active Chat Header */}
                <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => setActiveConversation(null)}
                      className="sm:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <Avatar className="w-9 h-9 ring-1 ring-slate-200">
                      <AvatarImage src={activeConversation.otherUser?.avatar} />
                      <AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-xs">
                        {activeConversation.otherUser?.name?.substring(0, 2).toUpperCase() || "US"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                        {activeConversation.otherUser?.name}
                      </h4>
                      <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        <span>Client-side 256-bit AES Encrypted</span>
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                    Secure Session
                  </Badge>
                </div>

                {/* E2EE Info Security Banner */}
                <div className="bg-emerald-50/70 border-b border-emerald-200/50 px-4 py-2 flex items-center gap-2 text-[11px] text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <p className="text-[10px] sm:text-[11px]">
                    <strong>Zero-Knowledge Security:</strong> Messages are encrypted on your device. The server and third parties cannot read these communications.
                  </p>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Decrypting conversation keys...</span>
                    </div>
                  ) : messages.length > 0 ? (
                    messages.map((msg) => {
                      const isMe = msg.senderId === currentUser.id;
                      const plainText = decryptedMap[msg.id] || "Decrypting...";

                      return (
                        <div
                          key={msg.id}
                          className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                        >
                          <div
                            className={`max-w-[82%] sm:max-w-[70%] p-3 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? "bg-blue-600 text-white rounded-br-xs"
                                : "bg-white text-slate-900 border border-slate-200 rounded-bl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{plainText}</p>
                          </div>

                          <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 px-1">
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString("en-GB", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {isMe && (
                              <CheckCheck
                                className={`w-3 h-3 ${
                                  msg.isRead ? "text-blue-500" : "text-slate-400"
                                }`}
                              />
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-16 text-center space-y-2">
                      <Lock className="w-8 h-8 text-emerald-400 mx-auto" />
                      <h4 className="font-bold text-xs text-slate-800">
                        End-to-End Encrypted Session Established
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                        Send your first secure message to {activeConversation.otherUser?.name}. All exchanges are encrypted with client-side cryptography.
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      placeholder={`Message ${activeConversation.otherUser?.name}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isSending}
                      className="pr-8 h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                    />
                    <Lock className="w-3.5 h-3.5 text-slate-300 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>

                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="h-10 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <>
                        <span>Send</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-black text-sm text-slate-900">
                  Select a Conversation to Start Chatting
                </h4>
                <p className="text-xs text-slate-500 max-w-xs">
                  Choose a student or tutor from the left sidebar to open a zero-knowledge end-to-end encrypted messaging session.
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowContactsList(true)}
                  className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs"
                >
                  + Start New Chat
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
