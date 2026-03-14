import { useState } from 'react';

interface TriggersProps {
  onTriggerChange: (trigger: string, value: number) => void;
  onBumperPress: (bumper: string, pressed: boolean) => void;
}

export function Triggers({ onTriggerChange, onBumperPress }: TriggersProps) {
  const [ltValue, setLtValue] = useState(0);
  const [rtValue, setRtValue] = useState(0);
  const [activeBumpers, setActiveBumpers] = useState<Set<string>>(new Set());

  const handleTriggerStart = (trigger: 'LT' | 'RT', clientY: number, startY: number) => {
    const delta = startY - clientY;
    const maxDistance = 80;
    const value = Math.max(0, Math.min(1, delta / maxDistance));
    
    if (trigger === 'LT') {
      setLtValue(value);
    } else {
      setRtValue(value);
    }
    
    onTriggerChange(trigger, value);
  };

  const handleBumperDown = (bumper: string) => {
    setActiveBumpers(prev => new Set(prev).add(bumper));
    onBumperPress(bumper, true);
  };

  const handleBumperUp = (bumper: string) => {
    setActiveBumpers(prev => {
      const newSet = new Set(prev);
      newSet.delete(bumper); // Fixed: was 'button', should be 'bumper'
      return newSet;
    });
    onBumperPress(bumper, false);
  };

  const Trigger = ({ 
    label, 
    value, 
    side 
  }: { 
    label: string; 
    value: number; 
    side: 'left' | 'right';
  }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);

    const handleStart = (clientY: number) => {
      setIsDragging(true);
      setStartY(clientY);
    };

    const handleMove = (clientY: number) => {
      if (!isDragging) return;
      handleTriggerStart(label as 'LT' | 'RT', clientY, startY);
    };

    const handleEnd = () => {
      setIsDragging(false);
      if (label === 'LT') {
        setLtValue(0);
      } else {
        setRtValue(0);
      }
      onTriggerChange(label, 0);
    };

    return (
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-12 h-20 sm:w-14 sm:h-22 md:w-16 md:h-24 bg-gray-800 border-2 border-gray-600 rounded-t-xl rounded-b-md relative overflow-hidden touch-none select-none cursor-pointer"
          onMouseDown={(e) => handleStart(e.clientY)}
          onMouseMove={(e) => handleMove(e.clientY)}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={(e) => {
            e.preventDefault();
            handleStart(e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            e.preventDefault();
            handleMove(e.touches[0].clientY);
          }}
          onTouchEnd={(e) => {
            e.preventDefault();
            handleEnd();
          }}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all"
            style={{ height: `${value * 100}%` }}
          />
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-xs text-gray-300 z-10">
            {label}
          </span>
        </div>
      </div>
    );
  };

  const Bumper = ({ 
    label, 
    side 
  }: { 
    label: string; 
    side: 'left' | 'right';
  }) => {
    const isActive = activeBumpers.has(label);
    
    return (
      <button
        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-800 border-2 border-gray-600 rounded-md transition-all touch-none select-none text-xs sm:text-sm"
        style={{
          backgroundColor: isActive ? '#4b5563' : '#1f2937',
          transform: isActive ? 'scale(0.95)' : 'scale(1)',
        }}
        onMouseDown={() => handleBumperDown(label)}
        onMouseUp={() => handleBumperUp(label)}
        onMouseLeave={() => activeBumpers.has(label) && handleBumperUp(label)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleBumperDown(label);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleBumperUp(label);
        }}
      >
        <span className="text-gray-300">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex justify-between w-full px-4">
      <div className="flex flex-col items-center gap-2">
        <Bumper label="LB" side="left" />
        <Trigger label="LT" value={ltValue} side="left" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <Bumper label="RB" side="right" />
        <Trigger label="RT" value={rtValue} side="right" />
      </div>
    </div>
  );
}