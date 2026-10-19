"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";

interface IMessage {
  _id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

interface ChatBoxProps {
  orderId?: string;
  gigId?: string;
  receiverId: string;
  receiverName: string;
  gigTitle?: string;
  gigImageUrl?: string;
}

export function ChatBox({ orderId, gigId, receiverId, receiverName, gigTitle, gigImageUrl }: ChatBoxProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const query = orderId 
        ? `orderId=${orderId}` 
        : `gigId=${gigId}&otherUserId=${receiverId}`;
        
      const res = await fetch(`/api/messages?${query}`);
      const data = await res.json();
      if (res.ok) setMessages(data.messages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000); 
    return () => clearInterval(interval);
  }, [orderId, gigId, receiverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage;
    setNewMessage("");

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          orderId: orderId || undefined, 
          gigId: gigId || undefined,
          receiverId: receiverId, 
          content: messageContent 
        }),
      });
      if (res.ok) fetchMessages();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-xl bg-white shadow-sm overflow-hidden">
      
      {/* ✅ REDESIGNED HEADER */}
      <div className="bg-gray-50 border-b px-4 py-3 flex items-center gap-4">
        {/* Thumbnail */}
        <div className="w-12 h-12 relative rounded-lg overflow-hidden bg-gray-200 shrink-0 border shadow-sm">
          {gigImageUrl ? (
            <Image 
              src={gigImageUrl} 
              alt="Gig Thumbnail" 
              fill 
              className="object-cover" 
              sizes="48px" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Text Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate text-base">
            Chat with {receiverName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-gray-500 shrink-0">Regarding:</span>
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md truncate max-w-full">
              {gigTitle || "Unknown Gig"}
            </span>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
        {loading ? (
          <p className="text-center text-gray-500 text-sm">Loading messages...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-gray-500 text-sm">No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === session?.user?.id;
            return (
              <div key={msg._id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg p-3 text-sm ${
                    isMe
                      ? "bg-blue-600 text-white rounded-br-none"
                      : "bg-white border text-gray-800 rounded-bl-none shadow-sm"
                  }`}
                >
                  {msg.content}
                  <div className={`text-[10px] mt-1 ${isMe ? "text-blue-200 text-right" : "text-gray-400 text-left"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSend} className="border-t p-3 flex gap-2 bg-white">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}