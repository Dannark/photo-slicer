import React from 'react';
import packageJson from '../../package.json';

const Version: React.FC = () => {
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      fontSize: '12px',
      color: '#666',
      padding: '5px 10px',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      v{packageJson.version}
    </div>
  );
};

export default Version;
