import React from 'react';

const Logo: React.FC = () => {
  return (
    <img 
      src="/logo.png" 
      alt="HookDebug Logo" 
      className="logo"
      width="40"
      height="40"
      style={{ height: '2.5rem', width: 'auto' }}
    />
  );
};

export default Logo;