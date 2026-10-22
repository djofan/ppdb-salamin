import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
}

export const PesantrenLogo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-2xl',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Emblem SVG: Islamic arch dome, book of Quran, crescent/minaret accent with gold ring */}
      <div
        className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0F2137] via-[#162D4A] to-[#0A1626] border border-[#D4AF37]/50 shadow-md p-1.5 overflow-hidden shrink-0`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#D4AF37]/20 via-transparent to-transparent pointer-events-none" />
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-[#D4AF37]"
        >
          {/* Islamic Arch Dome */}
          <path
            d="M24 4C24 4 11 12 11 24V40H37V24C37 12 24 4 24 4Z"
            stroke="#D4AF37"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          {/* Minaret Crescent on top */}
          <path
            d="M24 4V1M24 1C24.8 1 25.5 1.5 25.5 2.2C25.5 3 24.8 3.5 24 3.5C23.2 3.5 22.5 3 22.5 2.2C22.5 1.5 23.2 1 24 1Z"
            stroke="#F59E0B"
            strokeWidth="1.5"
          />
          {/* Open Quran symbol */}
          <path
            d="M16 32C18.5 30.5 21.5 30.5 24 32C26.5 30.5 29.5 30.5 32 32V21C29.5 19.5 26.5 19.5 24 21C21.5 19.5 18.5 19.5 16 21V32Z"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="#D4AF37"
            fillOpacity="0.25"
          />
          <path
            d="M24 21V32"
            stroke="#FFFFFF"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {/* Pen / Radiant Star */}
          <circle cx="24" cy="14" r="1.5" fill="#F59E0B" />
        </svg>
      </div>

      <div className="flex flex-col">
        <span
          className={`font-serif tracking-tight font-bold text-[#0F2137] ${textSizes[size]} leading-tight`}
        >
          Pondok Pesantren <span className="text-[#B8860B]">Salamatul Insan</span>
        </span>
        {showSubtitle && (
          <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            Sistem Seleksi & PPDB 2026/2027
          </span>
        )}
      </div>
    </div>
  );
};
