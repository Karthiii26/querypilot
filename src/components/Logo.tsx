import React, { useId } from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8', size }) => {
  const rawId = useId();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const gradId = `qpGrad_${safeId}`;
  const highlightId = `qpHighlight_${safeId}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="40%" stopColor="#4f46e5" />
          <stop offset="80%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={highlightId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </linearGradient>
      </defs>

      {/* Top Cap Disk */}
      <ellipse cx="256" cy="120" rx="170" ry="55" fill={`url(#${gradId})`} />
      <ellipse cx="256" cy="114" rx="150" ry="42" fill={`url(#${highlightId})`} />

      {/* Disk 1 Cylinder Body */}
      <path
        d="M 86 120 V 200 C 86 248 162 278 256 278 C 350 278 426 248 426 200 V 120 C 426 160 350 188 256 188 C 162 188 86 160 86 120 Z"
        fill={`url(#${gradId})`}
      />

      {/* Disk 2 Cylinder Body */}
      <path
        d="M 86 220 V 300 C 86 348 162 378 256 378 C 350 378 426 348 426 300 V 220 C 426 260 350 288 256 288 C 162 288 86 260 86 220 Z"
        fill={`url(#${gradId})`}
        opacity="0.9"
      />

      {/* Disk 3 Base Cylinder Body */}
      <path
        d="M 86 320 V 400 C 86 448 162 478 256 478 C 350 478 426 448 426 400 V 320 C 426 360 350 388 256 388 C 162 388 86 360 86 320 Z"
        fill={`url(#${gradId})`}
        opacity="0.8"
      />

      {/* Subtle indicator dot */}
      <circle cx="370" cy="125" r="14" fill="#38bdf8" />
    </svg>
  );
};

