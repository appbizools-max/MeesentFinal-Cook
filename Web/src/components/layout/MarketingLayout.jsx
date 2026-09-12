import React from 'react';

export const MarketingLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <div className="min-h-screen">{children}</div>
    </div>
  );
};

