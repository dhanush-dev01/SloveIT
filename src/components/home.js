import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './Home.css';

const Home = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://127.0.0.1:5000/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      console.log('Server response:', data);
      if (data.content) {
        setResponse(data.content); // Set formatted markdown content
      } else {
        setResponse('No response from the server.');
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse('An error occurred while fetching the response.');
    }
  };

  return (
    <div className="container">
      <div className="column input-column">
        <h2>Input</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Prompt:
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows="10"
              cols="50"
            />
          </label>
          <button type="submit">Submit</button>
        </form>
      </div>
      <div className="column output-column">
        <h2>Output</h2>
        {response && (
          <div className="response-box">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{response}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
