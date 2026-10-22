import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme?: 'navy' | 'amber' | 'blue' | 'purple' | 'emerald' | 'rose';
  isLoading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme = 'navy',
  isLoading = false,
}) => {
  const schemes = {
    navy: {
      border: 'border-slate-200/80 hover:border-[#0F2137]/30',
      iconBg: 'bg-[#0F2137]/5 text-[#0F2137]',
      accent: 'bg-[#0F2137]',
    },
    amber: {
      border: 'border-amber-200/80 hover:border-amber-300',
      iconBg: 'bg-amber-50 text-amber-600',
      accent: 'bg-amber-500',
    },
    blue: {
      border: 'border-blue-200/80 hover:border-blue-300',
      iconBg: 'bg-blue-50 text-blue-600',
      accent: 'bg-blue-600',
    },
    purple: {
      border: 'border-purple-200/80 hover:border-purple-300',
      iconBg: 'bg-purple-50 text-purple-600',
      accent: 'bg-purple-600',
    },
    emerald: {
      border: 'border-emerald-200/80 hover:border-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-600',
      accent: 'bg-emerald-600',
    },
    rose: {
      border: 'border-rose-200/80 hover:border-rose-300',
      iconBg: 'bg-rose-50 text-rose-600',
      accent: 'bg-rose-600',
    },
  };

  const scheme = schemes[colorScheme];

  return (
    <div
      className={`relative bg-white rounded-2xl p-5 border ${scheme.border} shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading ? (
              <div className="h-8 w-16 bg-slate-100 animate-pulse rounded-md" />
            ) : (
              <span className="text-3xl font-bold font-serif text-[#0F2137] tracking-tight">
                {value.toLocaleString('id-ID')}
              </span>
            )}
            <span className="text-xs text-slate-400 font-medium">Santri</span>
          </div>
        </div>
        <div className={`p-3 rounded-xl ${scheme.iconBg} transition-transform group-hover:scale-110 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {subtitle && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
        </div>
      )}
    </div>
  );
};
