import { ReactNode } from 'react';

interface ControlTooltipProps {
  label: string;
  description: string;
  visible: boolean;
  position?: 'top' | 'bottom' | 'left' | 'right';
  children: ReactNode;
}

export function ControlTooltip({ 
  label, 
  description, 
  visible, 
  position = 'top',
  children 
}: ControlTooltipProps) {
  if (!visible) return <>{children}</>;

  const displayDescription = description && description.trim() !== '' 
    ? description 
    : 'Non utilisé';

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-blue-600',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-blue-600',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-blue-600',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-blue-600',
  };

  return (
    <div className="relative inline-block">
      {children}
      <div 
        className={`absolute z-50 ${positionClasses[position]} pointer-events-none animate-in fade-in duration-200`}
      >
        <div className="relative">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-blue-400 min-w-max max-w-xs">
            <div className="font-bold text-sm mb-1">{label}</div>
            <div className="text-xs text-blue-100 leading-relaxed whitespace-normal">
              {displayDescription}
            </div>
          </div>
          <div className={`absolute w-0 h-0 ${arrowClasses[position]}`} />
        </div>
      </div>
    </div>
  );
}