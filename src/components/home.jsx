import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, User, Bot } from "lucide-react";

const Home = () => {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [chatHistory, setChatHistory] = useState([]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Add user message to history
    const userMessage = {
      role: "user",
      content: prompt,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMessage]);

    try {
      const res = await fetch("http://127.0.0.1:5000/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      console.log("Server response:", data);
      if (data.content) {
        setResponse(data.content);
        // Add assistant message to history
        const assistantMessage = {
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        };
        setChatHistory(prev => [...prev, assistantMessage]);
      } else {
        setResponse("No response from the server.");
      }
    } catch (error) {
      console.error("Error:", error);
      setResponse("An error occurred while fetching the response.");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
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
            <div 
              key={index}
              className={`history-item ${message.role}`}
            >
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
            {prompt && (
              <div className="message user">
                <div className="message-header">
                  <User className="h-5 w-5 text-purple-light" />
                  <span className="message-role">You</span>
                </div>
                <p>{prompt}</p>
              </div>
            )}
            {response && (
              <div className="message assistant">
                <div className="message-header">
                  <Bot className="h-5 w-5 text-purple-light" />
                  <span className="message-role">Assistant</span>
                </div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  className="prose"
                >
                  {response}
                </ReactMarkdown>
              </div>
            )}
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