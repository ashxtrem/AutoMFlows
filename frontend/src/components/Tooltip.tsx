import { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  content: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ content, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const getTooltipStyle = () => {
    return {
      position: 'fixed' as const,
      top: '20px',
      right: '20px',
      zIndex: 10000,
      pointerEvents: 'none' as const,
    };
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
          className="bg-gray-900 text-white text-base px-4 py-2 rounded-lg shadow-xl border border-gray-700 whitespace-nowrap font-medium"
        >
          {content}
        </div>
      )}
    </>
  );
}


