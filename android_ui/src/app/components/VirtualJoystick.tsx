import { useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  label?: string;
}

export function VirtualJoystick({ onMove, label }: VirtualJoystickProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const activeTouch = useRef<number | null>(null);

  const handleStart = (clientX: number, clientY: number, touchId?: number) => {
    if (activeTouch.current !== null) return;
    
    setIsDragging(true);
    if (touchId !== undefined) {
      activeTouch.current = touchId;
    }
    handleMove(clientX, clientY);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    
    const maxDistance = rect.width / 2 - 20;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    let x = deltaX;
    let y = deltaY;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      x = Math.cos(angle) * maxDistance;
      y = Math.sin(angle) * maxDistance;
    }
    
    setPosition({ x, y });
    
    // Normalize to -1 to 1 range
    const normalizedX = x / maxDistance;
    const normalizedY = y / maxDistance;
    
    onMove(normalizedX, normalizedY);
  };

  const handleEnd = () => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    activeTouch.current = null;
    onMove(0, 0);
  };

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || activeTouch.current === null) return;
      
      e.preventDefault();
      
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === activeTouch.current) {
          handleMove(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (activeTouch.current === null) return;
      
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouch.current) {
          handleEnd();
          break;
        }
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || activeTouch.current !== null) return;
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      if (activeTouch.current === null) {
        handleEnd();
      }
    };

    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col items-center gap-2">
      {label && <span className="text-sm text-gray-400">{label}</span>}
      <div
        ref={containerRef}
        className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-gray-800 border-2 border-gray-600 touch-none"
        onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const touch = e.touches[0];
          handleStart(touch.clientX, touch.clientY, touch.identifier);
        }}
      >
        <div
          className="absolute w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-full bg-blue-500 border-2 border-blue-300 shadow-lg transition-opacity"
          style={{
            left: '50%',
            top: '50%',
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            opacity: isDragging ? 1 : 0.7,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-1 h-1 rounded-full bg-gray-500" />
        </div>
      </div>
    </div>
  );
}