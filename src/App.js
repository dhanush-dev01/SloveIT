import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css';
import Home from './components/home';
function App() {
    return (
      <Router>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
      </Router>
    );
  }

  export default App;