import React from 'react';
import { HashRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import EndpointDetail from './pages/EndpointDetail';
import EndpointForm from './pages/EndpointForm';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-container">
            <Link to="/" className="nav-logo">
              🏥 Health Check Dashboard
            </Link>
            <ul className="nav-menu">
              <li className="nav-item">
                <Link to="/" className="nav-link">Dashboard</Link>
              </li>
              <li className="nav-item">
                <Link to="/endpoints/new" className="nav-link">Add Endpoint</Link>
              </li>
              <li className="nav-item">
                <Link to="/settings" className="nav-link">Settings</Link>
              </li>
            </ul>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/endpoints/new" element={<EndpointForm />} />
            <Route path="/endpoints/:id" element={<EndpointDetail />} />
            <Route path="/endpoints/:id/edit" element={<EndpointForm />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
