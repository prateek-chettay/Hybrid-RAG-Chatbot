"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Image as ImageIcon, Loader2, Book, X } from "lucide-react";

export default function ChatInterface() {
    const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
    const [input, setInput] = useState("");
    const [knowledgeInput, setKnowledgeInput] = useState("");
    const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 4 * 1024 * 1024) {
                alert("Image size should be less than 4MB");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    setImage(reader.result);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadKnowledge = async () => {
        if (!knowledgeInput.trim()) return;
        setIsLoading(true);
        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    knowledgeSource: knowledgeInput,
                    resetIndex: true
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to upload knowledge base.");
            }

            setKnowledgeInput("");
            setShowKnowledgeBase(false);
            setMessages((prev) => [...prev, { role: "assistant", content: "✅ Knowledge base updated! Old data removed and new context is now active." }]);
        } catch (error) {
            console.error(error);
            alert("Error updating knowledge base");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() && !image) return;

        const newMessage = { role: "user", content: input || "Analyze this image." };
        setMessages((prev) => [...prev, newMessage]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, newMessage],
                    base64Image: image,
                }),
            });

            setImage(null);
            if (fileInputRef.current) fileInputRef.current.value = "";

            if (!response.ok) {
                throw new Error("Failed to communicate with API.");
            }

            setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

            const reader = response.body?.getReader();
            const decoder = new TextDecoder("utf-8");

            if (!reader) throw new Error("No readable stream available");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6);
                        if (dataStr === "[DONE]") {
                            setIsLoading(false);
                            return;
                        }
                        try {
                            const data = JSON.parse(dataStr);
                            if (data.content) {
                                setMessages((prev) => {
                                    const newMsgs = [...prev];
                                    newMsgs[newMsgs.length - 1].content += data.content;
                                    return newMsgs;
                                });
                            }
                        } catch (e) {
                            console.error("JSON parse error on stream", e);
                        }
                    }
                }
            }
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, an error occurred." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden shadow-teal-500/10 relative">
            {/* Knowledge Base Drawer */}
            {showKnowledgeBase && (
                <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-md p-6 flex flex-col animate-in fade-in duration-300">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                            <Book className="text-teal-400" size={24} />
                            <h3 className="text-xl font-bold text-white">Knowledge Base Injection</h3>
                        </div>
                        <button onClick={() => setShowKnowledgeBase(false)} className="text-slate-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                    <p className="text-slate-400 mb-4 text-sm">
                        Paste any large text content here. This will **clear the previous database** and inject this new context for the AI to reference.
                    </p>
                    <textarea
                        value={knowledgeInput}
                        onChange={(e) => setKnowledgeInput(e.target.value)}
                        placeholder="Paste your documents, long texts, or references here..."
                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl p-4 text-slate-100 resize-none outline-none focus:ring-1 focus:ring-teal-500/50 transition-all mb-4 font-mono text-sm"
                    />
                    <button
                        onClick={handleUploadKnowledge}
                        disabled={isLoading || !knowledgeInput.trim()}
                        className="w-full py-4 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Send size={20} />}
                        Update Knowledge Base & Reset Database
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-teal-400 animate-pulse"></span>
                    Hybrid RAG Agent
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowKnowledgeBase(true)}
                        className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20 hover:bg-teal-500/20 transition-all"
                    >
                        <Book size={14} />
                        Knowledge Base
                    </button>

                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
                        <Send size={48} className="mb-4 text-slate-500" />
                        <p className="text-center font-medium max-w-sm">
                            Upload an image to extract context or ask me anything including "latest news".
                        </p>
                    </div>
                ) : (
                    messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl px-5 py-3 ${msg.role === "user"
                                    ? "bg-teal-600 text-white rounded-tr-none shadow-md"
                                    : "bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700 shadow-xl"
                                    }`}
                            >
                                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 rounded-2xl px-5 py-3 rounded-tl-none border border-slate-700 shadow-xl flex items-center gap-2">
                            <Loader2 className="animate-spin text-teal-400 h-5 w-5" />
                            <span className="text-slate-400 text-sm">Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                {image && (
                    <div className="mb-3 relative inline-block">
                        <img src={image} alt="Preview" className="h-20 rounded-lg border-2 border-slate-700" />
                        <button
                            onClick={() => {
                                setImage(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold"
                        >
                            ×
                        </button>
                    </div>
                )}

                <div className="flex gap-2">
                    <input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-slate-800 text-slate-200 hover:text-teal-400 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-teal-500/50"
                    >
                        <ImageIcon size={22} />
                    </button>

                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Type your message..."
                        className="flex-1 bg-slate-800 border border-slate-700 focus:border-teal-500 rounded-xl px-4 py-3 text-slate-100 resize-none outline-none focus:ring-1 focus:ring-teal-500/50 transition-all placeholder-slate-500"
                        rows={1}
                        style={{ minHeight: "50px", maxHeight: "150px" }}
                    />

                    <button
                        onClick={handleSend}
                        disabled={isLoading || (!input.trim() && !image)}
                        className="p-3 bg-teal-500 hover:bg-teal-400 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl transition-all shadow-lg active:scale-95 flex items-center justify-center font-medium"
                    >
                        <Send size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
}
