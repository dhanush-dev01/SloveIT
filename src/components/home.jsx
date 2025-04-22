import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, User, Bot, Trash } from "lucide-react";
import { motion } from "framer-motion";

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userMessage = { sender: "user", text: prompt, timestamp: new Date() };
    setMessages((prev) => [...prev, userMessage]);
    setChatHistory((prev) => [...prev, userMessage]);
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
      let botMessage = { sender: "bot", text: "", timestamp: new Date() };
      setMessages((prev) => [...prev, botMessage]);
      setChatHistory((prev) => [...prev, botMessage]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
      }

      const words = result.split(" ");
      let currentText = "";
      words.forEach((word, index) => {
        setTimeout(() => {
          currentText += (index === 0 ? "" : " ") + word;
          setMessages((prev) => {
            const lastIndex = prev.length - 1;
            return prev.map((msg, idx) =>
              idx === lastIndex ? { ...msg, text: currentText } : msg
            );
          });
          setChatHistory((prev) => {
            const lastIndex = prev.length - 1;
            return prev.map((msg, idx) =>
              idx === lastIndex ? { ...msg, text: currentText } : msg
            );
          });
        }, index * 100);
      });
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [...prev, { sender: "bot", text: "An error occurred.", timestamp: new Date() }]);
      setChatHistory((prev) => [...prev, { sender: "bot", text: "An error occurred.", timestamp: new Date() }]);
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

  const handleClearHistory = async () => {
    try {
      await fetch("http://localhost:5000/clear_history", {
        method: "POST",
      });
      setMessages([]);
      setChatHistory([]);
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  return (
    <div className="min-h-screen flex w-full">

      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Chat History</h2>
          <button className="clear-history-button" onClick={handleClearHistory}>
            <Trash className="h-5 w-5 text-red-500" />
          </button>
        </div>
        <div className="sidebar-content">
          {chatHistory.map((message, index) => (
            <div key={index} className={`history-item ${message.sender}`}>
              <div className="history-meta">
                <div className="history-role-container">
                  {message.sender === "user" ? (
                    <User className="h-4 w-4 text-purple-light" />
                  ) : (
                    <Bot className="h-4 w-4 text-purple-light" />
                  )}
                  <span className="history-role">
                    {message.sender === "user" ? "You" : "Assistant"}
                  </span>
                </div>
                <span className="history-time">
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <p className="history-content">
                {message.text.slice(0, 60)}
                {message.text.length > 60 ? "..." : ""}
              </p>
            </div>
          ))}
        </div>
      </div>

      <main className="main">
      <h1 className="logo">SolveIt</h1>
        <div className="chat-container">
          <div className="chat-content">
            {messages.map((msg, index) => (
              <motion.div 
                key={index} 
                className={`message ${msg.sender}`} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ duration: 0.3 }}
              >
                <div className="message-header">
                  {msg.sender === "user" ? <User className="h-5 w-5 text-purple-light" /> : <Bot className="h-5 w-5 text-purple-light" />}
                  <span className="message-role">{msg.sender === "user" ? "You" : "Assistant"}</span>
                </div>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="prose">
                  {msg.text}
                </ReactMarkdown>
              </motion.div>
            ))}
            <div ref={chatEndRef} />
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
