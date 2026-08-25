"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  Send,
  X,
  Search,
  MessageSquare,
  Loader2,
  CheckCheck,
  ArrowLeft,
  Users,
  MessageSquareLock,
  Minimize2,
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
  isOpen?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

export function EncryptedChatDrawer({
  currentUser,
  initialRecipientId,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onOpen: controlledOnOpen,
}: ChatDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleToggleOpen = () => {
    if (isOpen) {
      if (controlledOnClose) {
        controlledOnClose();
      } else {
        setInternalIsOpen(false);
      }
    } else {
      if (controlledOnOpen) {
        controlledOnOpen();
      } else {
        setInternalIsOpen(true);
      }
    }
  };

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

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

  // Calculate total unread messages
  const totalUnreadCount = useMemo(() => {
    return conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);
  }, [conversations]);

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
    fetchConversations();
    fetchContacts();
  }, []);

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

  const filteredContacts = contacts.filter((c) =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.headline?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredConversations = conversations.filter((conv) =>
    conv.otherUser?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      {/* Side Round Pop-up Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        <button
          onClick={handleToggleOpen}
          aria-label={isOpen ? "Close Messages" : "Open Messages"}
          title={isOpen ? "Close Messages" : "End-to-End Encrypted Messages"}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 transform active:scale-95 cursor-pointer relative group ${
            isOpen
              ? "bg-slate-900 text-white rotate-90 scale-100 hover:bg-slate-800"
              : "bg-gradient-to-tr from-[#0c2461] via-blue-600 to-indigo-600 text-white hover:scale-105 ring-4 ring-blue-500/20"
          }`}
        >
          {isOpen ? (
            <X className="w-6 h-6 transition-transform" />
          ) : (
            <div className="relative flex items-center justify-center">
              <MessageSquare className="w-6 h-6" />
              <Lock className="w-2.5 h-2.5 absolute -bottom-1 -right-1 text-emerald-300" />
            </div>
          )}

          {/* Unread Count Badge */}
          {!isOpen && totalUnreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-md animate-pulse">
              {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
            </span>
          )}

          {/* Tooltip Label on Hover (when closed) */}
          {!isOpen && (
            <div className="absolute right-full mr-3 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity shadow-lg hidden sm:flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>Messages</span>
            </div>
          )}
        </button>
      </div>

      {/* Floating Side Round Popup Window */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] max-w-[440px] h-[580px] max-h-[calc(100vh-7rem)] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#0c2461] text-white flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {activeConversation ? (
                <button
                  onClick={() => setActiveConversation(null)}
                  className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors mr-0.5"
                  title="Back to conversations"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-7 h-7 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center justify-center">
                  <MessageSquareLock className="w-3.5 h-3.5 text-blue-300" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-xs sm:text-sm text-white truncate">
                    {activeConversation ? activeConversation.otherUser?.name : "Academic Messages"}
                  </h3>
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 font-bold gap-0.5 flex items-center shrink-0">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                    <span>E2EE</span>
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-300 truncate">
                  {activeConversation
                    ? (activeConversation.otherUser?.role === "INSTRUCTOR" ? "Faculty Instructor" : "Student")
                    : "Zero-knowledge 256-bit encrypted"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Minimize Chat"
                title="Minimize"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Close Chat"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
            {activeConversation ? (
              // ACTIVE CONVERSATION CHAT VIEW
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Security reminder banner */}
                <div className="bg-emerald-50/80 border-b border-emerald-200/60 px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-emerald-900">
                  <Lock className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">
                    Encrypted on-device with AES-256 GCM.
                  </span>
                </div>

                {/* Messages Scroll Area */}
                <div className="flex-1 p-3.5 overflow-y-auto space-y-2.5 bg-slate-50/60">
                  {loadingMessages ? (
                    <div className="py-16 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Decrypting messages...</span>
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
                            className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs ${
                              isMe
                                ? "bg-blue-600 text-white rounded-br-xs"
                                : "bg-white text-slate-900 border border-slate-200 rounded-bl-xs"
                            }`}
                          >
                            <p className="whitespace-pre-wrap break-words">{plainText}</p>
                          </div>

                          <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-0.5 px-1">
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
                    <div className="py-12 text-center space-y-2">
                      <Lock className="w-7 h-7 text-emerald-500 mx-auto" />
                      <h4 className="font-bold text-xs text-slate-800">
                        Secure Conversation Started
                      </h4>
                      <p className="text-[11px] text-slate-500 max-w-[240px] mx-auto">
                        Send a message to {activeConversation.otherUser?.name}. All messages are encrypted with AES-256.
                      </p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Form */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2.5 border-t border-slate-200 bg-white flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <Input
                      ref={inputRef}
                      placeholder={`Message ${activeConversation.otherUser?.name || ""}...`}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      disabled={isSending}
                      className="pr-8 h-9 text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500 bg-slate-50"
                    />
                    <Lock className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  </div>

                  <Button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    size="sm"
                    className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold gap-1 shadow-xs cursor-pointer shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </form>
              </div>
            ) : (
              // CONVERSATIONS & CONTACTS LIST VIEW
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Search & Tabs */}
                <div className="p-3 border-b border-slate-200 space-y-2 bg-white">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      placeholder="Search messages or people..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 text-xs rounded-xl bg-slate-50 border-slate-200"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {showContactsList ? "Faculty & Students" : "Recent Chats"}
                    </span>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowContactsList(!showContactsList)}
                      className="h-6 px-2 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg cursor-pointer"
                    >
                      {showContactsList ? "View Chats" : "+ New Message"}
                    </Button>
                  </div>
                </div>

                {/* List Items */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 bg-white">
                  {showContactsList ? (
                    filteredContacts.length > 0 ? (
                      filteredContacts.map((contact) => (
                        <div
                          key={contact.id}
                          onClick={() => handleStartConversationWith(contact.id)}
                          className="p-3 flex items-center justify-between gap-3 hover:bg-blue-50/70 transition-colors cursor-pointer"
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
                                {contact.headline || (contact.role === "INSTRUCTOR" ? "Faculty Instructor" : "Student")}
                              </p>
                            </div>
                          </div>

                          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[9px] font-bold">
                            Chat
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
                    filteredConversations.length > 0 ? (
                      filteredConversations.map((conv) => {
                        return (
                          <div
                            key={conv.id}
                            onClick={() => handleSelectConversation(conv)}
                            className="p-3 flex items-center justify-between gap-2.5 hover:bg-slate-50 transition-colors cursor-pointer"
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
                        <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                        <p className="font-bold text-slate-700">No active conversations</p>
                        <p className="text-[11px] text-slate-500">
                          Click &quot;+ New Message&quot; to message your tutor or scholar.
                        </p>
                        <Button
                          size="sm"
                          onClick={() => setShowContactsList(true)}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl cursor-pointer"
                        >
                          + Start New Chat
                        </Button>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
