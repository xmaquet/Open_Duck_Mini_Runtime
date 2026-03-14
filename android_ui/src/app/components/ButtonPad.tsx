import { useState } from 'react';

interface ButtonPadProps {
  onButtonPress: (button: string, pressed: boolean) => void;
}

export function ButtonPad({ onButtonPress }: ButtonPadProps) {
  const [activeButtons, setActiveButtons] = useState<Set<string>>(new Set());

  const handleButtonDown = (button: string) => {
    setActiveButtons(prev => new Set(prev).add(button));
    onButtonPress(button, true);
  };

  const handleButtonUp = (button: string) => {
    setActiveButtons(prev => {
      const newSet = new Set(prev);
      newSet.delete(button);
      return newSet;
    });
    onButtonPress(button, false);
  };

  const Button = ({ 
    name, 
    color, 
    position 
  }: { 
    name: string; 
    color: string; 
    position: string;
  }) => {
    const isActive = activeButtons.has(name);
    
    return (
      <button
        className={`absolute w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full border-2 flex items-center justify-center text-white font-bold text-sm sm:text-base transition-all touch-none select-none ${position}`}
        style={{
          backgroundColor: isActive ? color : 'transparent',
          borderColor: color,
          transform: isActive ? 'scale(0.95)' : 'scale(1)',
          boxShadow: isActive ? 'inset 0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.3)',
        }}
        onMouseDown={() => handleButtonDown(name)}
        onMouseUp={() => handleButtonUp(name)}
        onMouseLeave={() => activeButtons.has(name) && handleButtonUp(name)}
        onTouchStart={(e) => {
          e.preventDefault();
          handleButtonDown(name);
        }}
        onTouchEnd={(e) => {
          e.preventDefault();
          handleButtonUp(name);
        }}
      >
        {name}
      </button>
    );
  };

  return (
    <div className="relative w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40">
      <Button name="Y" color="#fbbf24" position="top-0 left-1/2 -translate-x-1/2" />
      <Button name="B" color="#ef4444" position="top-1/2 right-0 -translate-y-1/2" />
      <Button name="A" color="#22c55e" position="bottom-0 left-1/2 -translate-x-1/2" />
      <Button name="X" color="#3b82f6" position="top-1/2 left-0 -translate-y-1/2" />
    </div>
  );
}