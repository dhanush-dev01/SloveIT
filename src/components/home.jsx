import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, User, Bot } from "lucide-react";

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [messages, setMessages] = useState([]); // ✅ Added missing useState
  const [isLoading, setIsLoading] = useState(false); // ✅ Added missing useState

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = { sender: "user", text: prompt };
    setMessages((prev) => [...prev, userMessage]); // ✅ Corrected state update
    setIsLoading(true);
    setPrompt("");

    try {
      const res = await fetch("http://127.0.0.1:5000/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      if (!res.body) throw new Error("No response body received.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let result = "";
      let botMessage = { sender: "bot", text: "" };

      setMessages((prev) => [...prev, botMessage]); // ✅ Corrected placement

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });

        // ✅ Fixing ESLint issue by updating state correctly
        setMessages((prev) => {
          const lastMessageIndex = prev.length - 1;
          return prev.map((msg, index) =>
            index === lastMessageIndex ? { ...msg, text: result } : msg
          );
        });
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "An error occurred." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex w-full">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Chat History</h2>
        </div>
        <div className="sidebar-content">
          {chatHistory.map((message, index) => (
            <div key={index} className={`history-item ${message.role}`}>
              <div className="history-meta">
                <div className="history-role-container">
                  {message.role === "user" ? (
                    <User className="h-4 w-4 text-purple-light" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-light" />
                  )}
                  <span className="history-role">
                    {message.role === "user" ? "You" : "Assistant"}
                  </span>
                </div>
                <span className="history-time">
                  {formatTime(message.timestamp)}
                </span>
              </div>
              <p className="history-content">
                {message.content.slice(0, 60)}
                {message.content.length > 60 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="main">
        <div className="chat-container">
          <div className="chat-content">
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.sender}`}>
                <div className="message-header">
                  {msg.sender === "user" ? (
                    <User className="h-5 w-5 text-purple-light" />
                  ) : (
                    <Bot className="h-5 w-5 text-purple-light" />
                  )}
                  <span className="message-role">
                    {msg.sender === "user" ? "You" : "Assistant"}
                  </span>
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose">
                  {msg.text}
                </ReactMarkdown>
              </div>
            ))}
          </div>
        </div>

        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-form">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Send a message..."
            />
            <button type="submit" className="submit-button">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Home;
