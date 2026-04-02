import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ShieldCheck, Store } from 'lucide-react';
import './HeroSlider.css';

const slides = [
  {
    title: 'SI\u00caU SALE \u0110A C\u1eeca H\u00c0NG',
    subtitle: 'H\u00e0ng ch\u00ednh h\u00e3ng t\u1eeb h\u00e0ng ngh\u00ecn vendor \u0111\u00e3 x\u00e1c th\u1ef1c',
    image: 'https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1920&auto=format&fit=crop',
    cta: 'Kh\u00e1m ph\u00e1 s\u1ea3n ph\u1ea9m',
    ctaLink: '/search?scope=products',
  },
  {
    title: 'Mua s\u1eafm an to\u00e0n, Platform b\u1ea3o v\u1ec7 100%',
    subtitle: 'Thanh to\u00e1n gi\u1eef t\u1ea1i s\u00e0n (escrow) cho \u0111\u1ebfn khi \u0111\u01a1n giao th\u00e0nh c\u00f4ng',
    image: 'https://images.unsplash.com/photo-1556740749-887f6717d7e4?q=80&w=1920&auto=format&fit=crop',
    cta: 'Xem cam k\u1ebft s\u00e0n',
    ctaLink: '/policy/bao-mat',
    icon: <ShieldCheck size={20} strokeWidth={1.8} />,
  },
  {
    title: 'Tr\u1edf th\u00e0nh \u0111\u1ed1i t\u00e1c Marketplace',
    subtitle: 'Ti\u1ebfp c\u1eadn 5 tri\u1ec7u kh\u00e1ch h\u00e0ng v\u00e0 h\u1ec7 th\u1ed1ng v\u1eadn h\u00e0nh chu\u1ea9n s\u00e0n',
    image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1920&auto=format&fit=crop',
    cta: '\u0110\u0103ng k\u00fd b\u00e1n h\u00e0ng',
    ctaLink: '/vendor/register',
    icon: <Store size={20} strokeWidth={1.8} />,
  },
];

const AUTO_DELAY = 5500;

const HeroSlider = () => {
  const navigate = useNavigate();
  const loopSlides = [slides[slides.length - 1], ...slides, slides[0]];
  const [position, setPosition] = useState(1);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const startXRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const maxPos = slides.length + 1;

  const restartTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      setPosition((prev) => Math.min(maxPos, prev + 1));
    }, AUTO_DELAY);
  }, [maxPos]);

  useEffect(() => {
    restartTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [restartTimer]);

  useEffect(() => {
    const node = trackRef.current;
    if (!node) return;

    const updateTrackWidth = () => {
      setTrackWidth(node.clientWidth);
    };

    updateTrackWidth();
    const observer = new ResizeObserver(updateTrackWidth);
    observer.observe(node);
    window.addEventListener('resize', updateTrackWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateTrackWidth);
    };
  }, []);

  const next = () => {
    setIsTransitioning(true);
    setPosition((prev) => Math.min(maxPos, prev + 1));
    restartTimer();
  };

  const prev = () => {
    setIsTransitioning(true);
    setPosition((prev) => Math.max(0, prev - 1));
    restartTimer();
  };

  const handleTransitionEnd = () => {
    if (position === slides.length + 1) {
      setIsTransitioning(false);
      setPosition(1);
    } else if (position === 0) {
      setIsTransitioning(false);
      setPosition(slides.length);
    } else if (position > slides.length + 1) {
      setIsTransitioning(false);
      setPosition(slides.length + 1);
    } else if (position < 0) {
      setIsTransitioning(false);
      setPosition(0);
    }
  };

  useEffect(() => {
    if (!isTransitioning) {
      const id = requestAnimationFrame(() => setIsTransitioning(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isTransitioning]);

  const handlePointerDown = (clientX: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsDragging(true);
    startXRef.current = clientX;
    setDragOffset(0);
    setIsTransitioning(false);
  };

  const handlePointerMove = (clientX: number) => {
    if (!isDragging) return;
    setDragOffset(clientX - startXRef.current);
  };

  const handlePointerUp = (clientX: number) => {
    if (!isDragging) return;
    const delta = clientX - startXRef.current;
    const threshold = 50;
    setIsDragging(false);
    setDragOffset(0);

    if (delta > threshold) {
      prev();
    } else if (delta < -threshold) {
      next();
    } else {
      setIsTransitioning(true);
      restartTimer();
    }
  };

  const handlePointerLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setDragOffset(0);
    setIsTransitioning(true);
    restartTimer();
  };

  const dragOffsetPercent = isDragging && trackWidth ? (dragOffset / trackWidth) * 100 : 0;

  return (
    <section className="hero-slider">
      <div
        className="hero-track"
        ref={trackRef}
        style={{
          transform: `translateX(calc(-${position * 100}% + ${dragOffsetPercent}%))`,
          transition: isTransitioning ? 'transform 0.7s ease' : 'none',
        }}
        onPointerDown={(e) => handlePointerDown(e.clientX)}
        onPointerMove={(e) => handlePointerMove(e.clientX)}
        onPointerUp={(e) => handlePointerUp(e.clientX)}
        onPointerLeave={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        onTouchStart={(e) => handlePointerDown(e.touches[0].clientX)}
        onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
        onTouchEnd={(e) => handlePointerUp(e.changedTouches[0].clientX)}
        onTransitionEnd={handleTransitionEnd}
      >
        {loopSlides.map((slide, i) => (
          <div key={`${slide.title}-${i}`} className="hero-slide">
            <img
              src={slide.image}
              alt={slide.title}
              className="hero-image"
              loading={i === position ? 'eager' : 'lazy'}
            />
            <div className="hero-overlay" />
            <div className="hero-content">
              <h1 className="hero-title">{slide.title}</h1>
              <p className="hero-subtitle">{slide.subtitle}</p>
              {slide.icon && <div className="hero-slide-icon">{slide.icon}</div>}
              <button
                className="hero-btn"
                onClick={() => {
                  if (slide.ctaLink) {
                    navigate(slide.ctaLink);
                  }
                }}
              >
                {slide.cta}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="hero-nav prev" onClick={prev} aria-label={'Slide tr\u01b0\u1edbc'}>
        <ChevronLeft size={22} />
      </button>
      <button className="hero-nav next" onClick={next} aria-label={'Slide ti\u1ebfp'}>
        <ChevronRight size={22} />
      </button>
    </section>
  );
};

export default HeroSlider;
