import React from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id="qpLogoGrad" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#0ea5e9" />
          <stop offset="30%" stopColor="#2563eb" />
          <stop offset="70%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* Top Cap */}
      <ellipse cx="256" cy="80" rx="180" ry="58" fill="url(#qpLogoGrad)" />

      {/* Top Disk Layer */}
      <path
        d="M 76 80 V 170 C 76 218 156 250 256 250 C 356 250 436 218 436 170 V 80 C 436 124 356 154 256 154 C 156 154 76 124 76 80 Z"
        fill="url(#qpLogoGrad)"
      />

      {/* White Gap / Separator 1 */}
      <path
        d="M 76 170 C 76 218 156 250 256 250 C 356 250 436 218 436 170"
        fill="none"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Middle Disk Layer */}
      <path
        d="M 76 170 V 290 C 76 338 156 370 256 370 C 356 370 436 338 436 290 V 170 C 436 218 356 250 256 250 C 156 250 76 218 76 170 Z"
        fill="url(#qpLogoGrad)"
      />

      {/* White Gap / Separator 2 */}
      <path
        d="M 76 290 C 76 338 156 370 256 370 C 356 370 436 338 436 290"
        fill="none"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinecap="round"
      />

      {/* Bottom Disk Layer */}
      <path
        d="M 76 290 V 410 C 76 458 156 490 256 490 C 356 490 436 458 436 410 V 290 C 436 338 356 370 256 370 C 156 370 76 338 76 290 Z"
        fill="url(#qpLogoGrad)"
      />
    </svg>
  );
};
