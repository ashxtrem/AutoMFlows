import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let x = 0;
      let y = 0;

      switch (position) {
        case 'top':
          x = rect.left + rect.width / 2;
          y = rect.top - 5;
          break;
        case 'bottom':
          x = rect.left + rect.width / 2;
          y = rect.bottom + 5;
          break;
        case 'left':
          x = rect.left - 5;
          y = rect.top + rect.height / 2;
          break;
        case 'right':
          x = rect.right + 5;
          y = rect.top + rect.height / 2;
          break;
      }

      setTooltipPosition({ x, y });
    }
  }, [isVisible, position]);

  const getTooltipStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'fixed',
      left: `${tooltipPosition.x}px`,
      top: `${tooltipPosition.y}px`,
      zIndex: 10000,
      pointerEvents: 'none',
    };

    switch (position) {
      case 'top':
        return { ...baseStyle, transform: 'translate(-50%, -100%)' };
      case 'bottom':
        return { ...baseStyle, transform: 'translate(-50%, 0)' };
      case 'left':
        return { ...baseStyle, transform: 'translate(-100%, -50%)' };
      case 'right':
        return { ...baseStyle, transform: 'translate(0, -50%)' };
      default:
        return { ...baseStyle, transform: 'translate(-50%, -100%)' };
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          style={getTooltipStyle()}
          className="bg-gray-900 text-white text-xs px-2 py-1 rounded shadow-lg border border-gray-700 whitespace-nowrap"
        >
          {content}
        </div>
      )}
    </>
  );
}

