import React from 'react';

export interface TicketCardProps {
  children: React.ReactNode;
  className?: string;
}

export const TicketCard: React.FC<TicketCardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`bg-white rounded-lg border border-[#e6e5df] shadow-sm overflow-hidden relative ${className}`}
    >
      {children}
    </div>
  );
};

export const TicketPerforation: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`ticket-perforation ${className}`}>
      <div className="ticket-perforation-line" />
    </div>
  );
};
