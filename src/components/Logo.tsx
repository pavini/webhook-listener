import React from 'react';

const Logo: React.FC = () => {
  return (
    <img 
      src="/logo.png" 
      alt="HookDebug Logo" 
      className="logo"
      style={{ height: '2.5rem', width: 'auto' }}
    />
  );
};

export default Logo;