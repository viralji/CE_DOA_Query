'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Bot, User, Send, LogOut, FileText } from 'lucide-react';

// Format bot response for better readability
function formatBotResponse(text: string): React.ReactNode {
  // Remove markdown formatting (**, *, etc.) more aggressively
  let cleanText = text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markers and content
    .replace(/\*([^*]+)\*/g, '$1')     // Remove italic markers and content
    .replace(/\*\s+/g, '')             // Remove bullet point markers
    .replace(/#{1,6}\s/g, '')          // Remove heading markers
    .replace(/\*\*/g, '')              // Remove any remaining **
    .replace(/\*/g, '');               // Remove any remaining *
  
  // Split by lines and format
  const lines = cleanText.split('\n');
  const elements: React.ReactNode[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) {
      elements.push(<br key={i} />);
      continue;
    }
    
    // Check for scenario headers (e.g., "For disposals up to...")
    if (line.match(/^For\s+/i)) {
      elements.push(
        <div key={i} className="mb-3 mt-4 first:mt-0">
          <span className="font-semibold text-blue-400 text-base block pb-1 border-b border-blue-900/30">
            {line}
          </span>
        </div>
      );
    }
    // Check for source lines
    else if (line.match(/^Source/i)) {
      elements.push(
        <div key={i} className="mt-4 pt-3 border-t border-[#444444] text-xs text-gray-400 italic">
          {line}
        </div>
      );
    }
    // Regular text with highlighting for approval codes and amounts
    else {
      // Highlight approval codes like (A1), (A2), (R1), (I) and amounts like INR 5 million, 30 lakh
      const parts = line.split(/(\([AIR]\d*\*?\)|INR\s+[\d\s]+(?:million|lakh|crore|MN|L|CR)?|[\d\s]+(?:lakh|crore|million)\s+per\s+transaction)/gi);
      const formattedLine = parts.map((part, idx) => {
        // Highlight approval codes
        if (part.match(/^\([AIR]\d*\*?\)$/i)) {
          return (
            <span key={idx} className="font-semibold text-yellow-400 bg-yellow-900/30 px-1.5 py-0.5 rounded mx-0.5 inline-block">
              {part}
            </span>
          );
        }
        // Highlight amounts (INR X million/lakh/crore or X lakh/crore/million)
        if (part.match(/^(INR\s+)?[\d\s]+(?:million|lakh|crore|MN|L|CR)(?:\s+per\s+transaction)?$/i)) {
          return (
            <span key={idx} className="font-semibold text-green-400 bg-green-900/20 px-1.5 py-0.5 rounded mx-0.5 inline-block">
              {part}
            </span>
          );
        }
        return <span key={idx}>{part}</span>;
      });
      
      elements.push(
        <div key={i} className="mb-2.5 text-gray-100 leading-relaxed pl-1">
          {formattedLine}
        </div>
      );
    }
  }
  
  return <div className="space-y-1">{elements}</div>;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  sources?: Source[];
}

interface Source {
  rowNumber: number | null;
  category: string | null;
  no: string | null;
  limits: string | null;
  shareholderApproval: string | null;
  boardApproval: string | null;
  ceo: string | null;
  content: string;
}

export default function ChatPage() {
  const { data: session } = useSession();
  const isDevelopment = process.env.NODE_ENV === 'development';
  const [devMode, setDevMode] = useState(false);
  
  // Check for dev bypass on mount
  useEffect(() => {
    if (isDevelopment && typeof window !== 'undefined') {
      const bypass = localStorage.getItem('dev-bypass-auth') === 'true';
      setDevMode(bypass);
      if (bypass && !session) {
        // Set a cookie for middleware
        document.cookie = 'dev-bypass-auth=true; path=/';
      }
    }
  }, [session, isDevelopment]);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your DOA Assistant. Ask me anything about Delegation of Authority, approval processes, and company policies!",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleSource = (messageId: string) => {
    const newExpanded = new Set(expandedSources);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedSources(newExpanded);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMessage.text }),
      });

      if (response.ok) {
        const data = await response.json();
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          sender: 'bot',
          timestamp: new Date(),
          sources: data.sources || [],
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        const errorData = await response.json();
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I encountered an error: ${errorData.error || 'Unknown error'}`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Network error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Sorry, I'm having trouble connecting to the server. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Allow access in dev mode with bypass, or with valid session
  if (!session && !(isDevelopment && devMode)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="bg-[#111111] border-b border-[#333333] px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
              <Bot size={20} color="#ffffff" />
            </div>
            <h1 className="text-xl font-semibold">DOA Assistant</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">
              {session?.user?.email || (isDevelopment && devMode ? 'Dev Mode (No Auth)' : '')}
            </span>
            {isDevelopment && devMode && (
              <span className="text-xs text-yellow-500 bg-yellow-900/20 px-2 py-1 rounded">
                DEV MODE
              </span>
            )}
            {session && (
              <button
                onClick={() => {
                  if (isDevelopment && devMode) {
                    localStorage.removeItem('dev-bypass-auth');
                    document.cookie = 'dev-bypass-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                    window.location.href = '/signin';
                  } else {
                    signOut({ callbackUrl: '/signin' });
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#333333] hover:bg-[#444444] rounded-lg text-sm transition-colors"
              >
                <LogOut size={16} />
                {isDevelopment && devMode ? 'Exit Dev Mode' : 'Sign Out'}
              </button>
            )}
          </div>
        </div>
        {/* Approval Code Legend */}
        <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-[#333333] pt-2 mt-2">
          <span className="font-semibold text-gray-300">Legend:</span>
          <span>R: Responsible</span>
          <span>A: Approver</span>
          <span>I: To be Informed</span>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 bg-black">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`flex items-start gap-3 max-w-[80%] ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.sender === 'user'
                      ? 'bg-blue-600'
                      : 'bg-[#333333]'
                  }`}
                >
                  {message.sender === 'user' ? (
                    <User size={16} color="#ffffff" />
                  ) : (
                    <Bot size={16} color="#cccccc" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                <div 
                  className={`px-4 py-3 rounded-2xl ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-md'
                      : 'bg-[#1a1a1a] border border-[#333333] text-gray-100 rounded-bl-md'
                  }`}
                >
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {message.sender === 'bot' ? (
                      <div className="prose prose-invert prose-sm max-w-none">
                        {formatBotResponse(message.text)}
                      </div>
                    ) : (
                      message.text
                    )}
                  </div>
                </div>
                  
                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2">
                      <button
                        onClick={() => toggleSource(message.id)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <FileText size={14} />
                        <span>
                          {expandedSources.has(message.id)
                            ? 'Hide'
                            : 'Show'}{' '}
                          {message.sources.length} source
                          {message.sources.length !== 1 ? 's' : ''}
                        </span>
                      </button>
                      {expandedSources.has(message.id) && (
                        <div className="mt-2 space-y-2">
                          {message.sources.map((source, idx) => (
                            <div
                              key={idx}
                              className="bg-[#2d2d2d] border border-[#444444] rounded-lg p-3 text-xs"
                            >
                              <div className="font-semibold text-gray-300 mb-2">
                                Source {idx + 1}
                                {source.rowNumber && ` (Row ${source.rowNumber})`}
                              </div>
                              {source.category && (
                                <div className="text-gray-400 mb-1">
                                  Category: {source.category}
                                </div>
                              )}
                              {source.no && (
                                <div className="text-gray-400 mb-1">
                                  No: {source.no}
                                </div>
                              )}
                              {source.limits && (
                                <div className="text-gray-400 mb-1">
                                  Limits: {source.limits}
                                </div>
                              )}
                              {source.shareholderApproval && (
                                <div className="text-gray-400 mb-1">
                                  Shareholder Approval: {source.shareholderApproval}
                                </div>
                              )}
                              {source.boardApproval && (
                                <div className="text-gray-400 mb-1">
                                  Board Approval: {source.boardApproval}
                                </div>
                              )}
                              {source.ceo && (
                                <div className="text-gray-400 mb-1">
                                  CEO Approval: {source.ceo}
                                </div>
                              )}
                              {source.content && (
                                <div className="text-gray-500 mt-2 italic border-t border-[#444444] pt-2">
                                  {source.content}...
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start gap-3 max-w-[80%]">
                <div className="w-8 h-8 rounded-full bg-[#333333] flex items-center justify-center">
                  <Bot size={16} color="#cccccc" />
                </div>
                <div className="bg-[#1a1a1a] border border-[#333333] px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-[#111111] border-t border-[#333333] px-6 py-4 sticky bottom-0">
        <div className="max-w-4xl mx-auto flex gap-3">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question about DOA, approval processes, or company policies..."
            className="flex-1 bg-[#1a1a1a] border border-[#333333] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            rows={1}
            disabled={isLoading}
            style={{ minHeight: '48px', maxHeight: '120px' }}
          />
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-[#333333] disabled:text-gray-500 rounded-lg transition-colors flex items-center gap-2"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
