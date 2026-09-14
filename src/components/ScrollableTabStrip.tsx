import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollableTabStripProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  activeKey?: string;
}

export const ScrollableTabStrip: React.FC<ScrollableTabStripProps> = ({
  children,
  className = '',
  style,
  activeKey
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;

    // Center active tab if found
    const activeEl = el.querySelector('.active') as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, [children, activeKey, updateScrollState]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === 'left' ? -180 : 180;
    el.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Mouse Drag-to-Scroll support (for desktop/DevTools touch simulation)
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollStart(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollStart - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="scrollable-tab-wrapper"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '100%',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        ...style
      }}
    >
      {/* Left Scroll Arrow */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScroll('left')}
          className="tab-scroll-arrow tab-scroll-arrow-left"
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      {/* Main Tab Strip */}
      <div
        ref={scrollRef}
        className={`tab-strip ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: isDragging ? 'grabbing' : 'default',
          userSelect: isDragging ? 'none' : 'auto'
        }}
      >
        {children}
      </div>

      {/* Right Scroll Arrow */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => handleScroll('right')}
          className="tab-scroll-arrow tab-scroll-arrow-right"
          title="Scroll tabs right for more items"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};
