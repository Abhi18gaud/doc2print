import React from 'react';

export interface StampBadgeProps {
  status: 'PAID' | 'PRINTING' | 'QUEUED' | 'VERIFIED' | 'READY' | 'FAILED' | 'ONLINE' | 'CASH';
  size?: 'sm' | 'md' | 'lg';
  tilt?: boolean;
}

export const StampBadge: React.FC<StampBadgeProps> = ({
  status,
  size = 'md',
  tilt = true,
}) => {
  let colorClass = 'stamp-green';
  if (status === 'PRINTING' || status === 'QUEUED') {
    colorClass = 'stamp-ink';
  } else if (status === 'FAILED') {
    colorClass = 'border-[1.5px] border-[#ba1a1a] text-[#ba1a1a] bg-[#ffdad6]/40';
  } else if (status === 'CASH') {
    colorClass = 'stamp-orange';
  }

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-1.5 py-0.5'
      : size === 'lg'
      ? 'text-[13px] px-3 py-1 tracking-widest'
      : 'text-[11px] px-2 py-0.5';

  return (
    <span
      className={`stamp-badge ${colorClass} ${sizeClass} ${
        tilt ? 'stamp-tilt' : ''
      } transition-transform select-none inline-block`}
    >
      {status}
    </span>
  );
};
