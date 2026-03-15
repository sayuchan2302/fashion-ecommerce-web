import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import './CartAnimation.css';

interface CartAnimationContextType {
  triggerAnimation: (event: React.MouseEvent, imgSrc: string) => void;
  cartIconRef: React.RefObject<HTMLButtonElement | null>;
}

const CartAnimationContext = createContext<CartAnimationContextType | undefined>(undefined);

export const CartAnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const cartIconRef = useRef<HTMLButtonElement>(null);
  const [animations, setAnimations] = useState<{ id: string; startX: number; startY: number; imgSrc: string }[]>([]);

  const triggerAnimation = useCallback((event: React.MouseEvent, imgSrc: string) => {
    if (!cartIconRef.current) return;

    // Get click coordinates (start position)
    const startX = event.clientX;
    const startY = event.clientY;

    const newAnimationId = Math.random().toString(36).substring(7);

    setAnimations(prev => [...prev, { id: newAnimationId, startX, startY, imgSrc }]);

    // Remove the animation element after it completes
    setTimeout(() => {
      setAnimations(prev => prev.filter(anim => anim.id !== newAnimationId));
    }, 800); // Duration matches CSS transition
  }, []);

  return (
    <CartAnimationContext.Provider value={{ triggerAnimation, cartIconRef }}>
      {children}
      {animations.map(anim => (
        <FlyingImage 
          key={anim.id} 
          startX={anim.startX} 
          startY={anim.startY} 
          endElementRef={cartIconRef} 
          imgSrc={anim.imgSrc} 
        />
      ))}
    </CartAnimationContext.Provider>
  );
};

export const useCartAnimation = () => {
  const context = useContext(CartAnimationContext);
  if (!context) {
    throw new Error('useCartAnimation must be used within a CartAnimationProvider');
  }
  return context;
};

// --- Flying Image Component ---
const FlyingImage: React.FC<{
  startX: number;
  startY: number;
  endElementRef: React.RefObject<HTMLButtonElement | null>;
  imgSrc: string;
}> = ({ startX, startY, endElementRef, imgSrc }) => {
  const [position, setPosition] = useState({ x: startX, y: startY });
  const [isFlying, setIsFlying] = useState(false);

  React.useEffect(() => {
    // Start animation on next frame to ensure initial position is rendered
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (endElementRef.current) {
          const endRect = endElementRef.current.getBoundingClientRect();
          // Calculate center of the cart icon
          const endX = endRect.left + endRect.width / 2;
          const endY = endRect.top + endRect.height / 2;

          setPosition({ x: endX, y: endY });
          setIsFlying(true);
        }
      });
    });
  }, [endElementRef]);

  // If start and end are exactly the same immediately, don't show
  if (!isFlying && position.x === startX && position.y === startY) {
    // We still render it initially at start position, but hide via opacity if needed
  }

  return (
    <img
      src={imgSrc}
      className={`cart-flying-img ${isFlying ? 'flying' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        // Initial transform to center the image on the cursor
        transform: isFlying ? 'translate(-50%, -50%) scale(0.1)' : 'translate(-50%, -50%) scale(1)',
      }}
      alt=""
      aria-hidden="true"
    />
  );
};
