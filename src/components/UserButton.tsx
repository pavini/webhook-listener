import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const UserButton = () => {
  const { user, loading, login, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (loading) {
    return <div className="user-button loading">Loading...</div>;
  }

  if (!user) {
    return (
      <button className="login-btn" onClick={login}>
        <span className="github-icon">🐙</span>
        Login with GitHub
      </button>
    );
  }

  return (
    <div className="user-button">
      <button 
        className="user-avatar"
        onClick={() => setDropdownOpen(!dropdownOpen)}
      >
        <img src={user.avatar_url} alt={user.username} />
        <span>{user.display_name || user.username}</span>
        <span className="dropdown-arrow">▼</span>
      </button>
      
      {dropdownOpen && (
        <div className="user-dropdown">
          <div className="user-info">
            <img src={user.avatar_url} alt={user.username} />
            <div>
              <div className="user-name">{user.display_name || user.username}</div>
              <div className="user-username">@{user.username}</div>
            </div>
          </div>
          <button className="logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      )}
    </div>
  );
};