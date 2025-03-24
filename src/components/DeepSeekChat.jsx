import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "./DeepSeekChat.css";
import "highlight.js/styles/github-dark.min.css";

const API_URL = "http://localhost:5000/v1/chat/completions";

const ThinkingIndicator = () => (
  <div className="thinking-indicator">
    <svg
      className="thinking-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <span>AI is thinking</span>
    <div className="thinking-dots">
      <div className="thinking-dot" />
      <div className="thinking-dot" />
      <div className="thinking-dot" />
    </div>
  </div>
);

const MessageContent = ({ content, isUser, isThinking }) => {
  if (isUser) {
    return <div className="message-text">{content}</div>;
  }

  // Handle think content
  const isThinkContent =
    content?.startsWith("<think>") && content?.endsWith("</think>");
  const thinkContent = isThinkContent ? content.slice(7, -8).trim() : null;

  if (thinkContent) {
    return (
      <div className="think-content">
        <div className="think-header">
          <svg
            className="think-icon"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 16V12M12 8H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>Thinking Process</span>
        </div>
        <div className="think-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
            components={{
              p: ({ children }) => <p className="think-p">{children}</p>,
              code: ({ inline, className, children, ...props }) => {
                if (inline) {
                  return (
                    <code className="think-inline-code" {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <div className="think-code-block">
                    <code className={className} {...props}>
                      {children}
                    </code>
                  </div>
                );
              },
            }}
          >
            {thinkContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => <p className="markdown-p">{children}</p>,
          code: ({ inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || "");
            const language = match ? match[1] : "";
            if (inline) {
              return (
                <code className="markdown-inline-code" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <div className="code-block">
                {language && <div className="code-language">{language}</div>}
                <code className={className} {...props}>
                  {children}
                </code>
              </div>
            );
          },
          pre: ({ children }) => <pre className="markdown-pre">{children}</pre>,
          ul: ({ children }) => <ul className="markdown-ul">{children}</ul>,
          ol: ({ children }) => <ol className="markdown-ol">{children}</ol>,
          li: ({ children }) => <li className="markdown-li">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="markdown-blockquote">{children}</blockquote>
          ),
          table: ({ children }) => (
            <table className="markdown-table">{children}</table>
          ),
          th: ({ children }) => <th className="markdown-th">{children}</th>,
          td: ({ children }) => <td className="markdown-td">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
      {isThinking && (
        <div className="cursor-container">
          <div className="cursor"></div>
        </div>
      )}
    </div>
  );
};

export default function DeepSeekChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messageEndRef = useRef(null);
  const inputRef = useRef(null);

  const EmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <h2>Welcome to DeepSeek Chat</h2>
      <p>Start a conversation with DeepSeek AI. You can:</p>
      <ul>
        <li>Ask questions about any topic</li>
        <li>Get help with coding and technical problems</li>
        <li>Brainstorm ideas and solutions</li>
        <li>Learn about new concepts and technologies</li>
      </ul>
      <div className="empty-state-footer">Type your message below to begin</div>
    </div>
  );

  const scrollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setIsThinking(true);

    const messageId = Date.now();
    setMessages((prev) => {
      if (prev.some((m) => m.id === messageId)) return prev;
      return [...prev, { id: messageId, role: "user", content: userMessage }];
    });

    try {
      if (isStreaming) {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: messages.concat([{ role: "user", content: userMessage }]),
            stream: true,
          }),
        });

        if (!response.ok) throw new Error("Network response was not ok");

        setIsThinking(false);
        const assistantMessageId = Date.now();
        setMessages((prev) => {
          if (prev.some((m) => m.id === assistantMessageId)) return prev;
          return [
            ...prev,
            { id: assistantMessageId, role: "assistant", content: "" },
          ];
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.trim() && line.startsWith("data: ")) {
              const content = line.slice(6);
              if (content === "[DONE]") continue;

              try {
                const json = JSON.parse(content);
                const delta = json.choices[0].delta?.content;
                if (delta) {
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage.id !== assistantMessageId) return prev;
                    lastMessage.content = (lastMessage.content || "") + delta;
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Error parsing streaming response:", e);
              }
            }
          }
        }
      } else {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: messages.concat([{ role: "user", content: userMessage }]),
            stream: false,
          }),
        });

        if (!response.ok) throw new Error("Network response was not ok");
        setIsThinking(false);
        const data = await response.json();
        if (data.choices && data.choices[0]?.message?.content) {
          const messageId = Date.now();
          setMessages((prev) => {
            if (prev.some((m) => m.id === messageId)) return prev;
            return [
              ...prev,
              {
                id: messageId,
                role: "assistant",
                content: data.choices[0].message.content,
              },
            ];
          });
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setIsThinking(false);
      const messageId = Date.now();
      setMessages((prev) => {
        if (prev.some((m) => m.id === messageId)) return prev;
        return [
          ...prev,
          {
            id: messageId,
            role: "assistant",
            content:
              "Sorry, there was an error processing your request. Please try again.",
          },
        ];
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.length === 0 ? (
          <EmptyState />
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id}
              className={`message ${
                message.role === "user" ? "user-message" : "assistant-message"
              }`}
            >
              {message.content ? (
                <MessageContent
                  content={message.content}
                  isUser={message.role === "user"}
                  isThinking={isLoading && index === messages.length - 1}
                />
              ) : (
                message.role === "assistant" &&
                isLoading &&
                index === messages.length - 1 && (
                  <div className="thinking-message">
                    <div className="cursor-container">
                      <div className="cursor"></div>
                    </div>
                  </div>
                )
              )}
            </div>
          ))
        )}
        {isThinking && <ThinkingIndicator />}
        <div ref={messageEndRef} />
      </div>

      <div className="controls">
        <div className="stream-toggle">
          <label className="switch">
            <input
              type="checkbox"
              checked={isStreaming}
              onChange={(e) => setIsStreaming(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
          <span className="stream-label">Stream Response</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="input-area">
        <input
          ref={inputRef}
          type="text"
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          {isLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
