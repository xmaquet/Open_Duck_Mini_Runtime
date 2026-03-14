import { useState } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

interface DPadProps {
  onDirectionPress: (direction: string, pressed: boolean) => void;
}

export function DPad({ onDirectionPress }: DPadProps) {
  const [activeDirections, setActiveDirections] = useState<Set<string>>(new Set());

  const handleDirectionDown = (direction: string) => {
    setActiveDirections(prev => new Set(prev).add(direction));
    onDirectionPress(direction, true);
  };

  const handleDirectionUp = (direction: string) => {
    setActiveDirections(prev => {
      const newSet = new Set(prev);
      newSet.delete(direction);
      return newSet;
    });
    onDirectionPress(direction, false);
  };

  const DirectionButton = ({ 
    direction, 
    icon: Icon, 
    position 
  }: { 
    direction: string; 
    icon: any; 
    position: string;
  }) => {
    const isActive = activeDirections.has(direction);
    
    return (
      <button
        className={`absolute w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center transition-all touch-none select-none ${position}`}
        style={{
          backgroundColor: isActive ? '#4b5563' : '#1f2937',
          transform: isActive ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseDown={() => handleDirectionDown(direction)}
        onMouseUp={() => handleDirectionUp(direction)}
        onMouseLeave={() => activeDirections.has(direction) && handleDirectionUp(direction)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleDirectionDown(direction);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleDirectionUp(direction);
        }}
      >
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300" />
      </button>
    );
  };

  return (
    <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gray-700" />
      </div>
      <DirectionButton direction="up" icon={ChevronUp} position="top-0 left-1/2 -translate-x-1/2" />
      <DirectionButton direction="right" icon={ChevronRight} position="top-1/2 right-0 -translate-y-1/2" />
      <DirectionButton direction="down" icon={ChevronDown} position="bottom-0 left-1/2 -translate-x-1/2" />
      <DirectionButton direction="left" icon={ChevronLeft} position="top-1/2 left-0 -translate-y-1/2" />
    </div>
  );
}