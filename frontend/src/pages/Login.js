import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authAPI } from '../services/api';
import { FiActivity, FiShield, FiMail, FiLock } from 'react-icons/fi';
import '../App.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const fillCredentials = () => {
    setEmail('admin@disaster-response.gov');
    setPassword('Admin123!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authAPI.login({ email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('Login successful! Welcome to ADRC.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <FiActivity className="login-logo-icon" />
            <FiShield className="login-shield-icon" />
          </div>
          <h1 className="login-title">AI Disaster Response</h1>
          <h2 className="login-subtitle">Coordinator Platform</h2>
          <p className="login-desc">Emergency Management & AI-Powered Response System</p>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label"><FiMail /> Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label"><FiLock /> Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In to Command Center'}
          </button>
          <button type="button" className="fill-credentials-btn" onClick={fillCredentials}>
            Fill Demo Credentials
          </button>
        </form>
        <div className="login-footer">
          <p>Authorized Personnel Only | FEMA Certified Platform</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
