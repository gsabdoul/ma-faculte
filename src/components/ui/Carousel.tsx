import { useState, useEffect, useRef } from 'react';
interface CarouselItem {
  id: string;
  imageUrl: string;
  alt: string;
  title: string;
  learnMoreUrl: string;
}

interface CarouselProps {
  items: CarouselItem[];
}

export function Carousel({ items }: CarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const startXRef = useRef<number | null>(null);

  useEffect(() => {
    // Si il n'y a pas d'items ou un seul, on n'active pas le défilement
    if (items.length <= 1) return;

    const startAutoPlay = () => {
      stopAutoPlay();
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }, 3000);
    };

    const stopAutoPlay = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    startAutoPlay();
    return () => stopAutoPlay();
  }, [items.length]);

  const stopAutoPlay = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const startAutoPlay = () => {
    if (items.length <= 1) return;
    if (!intervalRef.current) {
      intervalRef.current = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
      }, 3000);
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    stopAutoPlay();
  };

  const onPointerMove = (_e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || startXRef.current === null) return;
    // On pourrait ajouter un effet de translate ici si souhaité
  };

  const finishDrag = (clientX: number) => {
    if (!draggingRef.current || startXRef.current === null) return;
    const delta = clientX - startXRef.current;
    const threshold = 50; // pixels
    if (delta > threshold) {
      // swipe droite -> image précédente
      setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (delta < -threshold) {
      // swipe gauche -> image suivante
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }
    draggingRef.current = false;
    startXRef.current = null;
    startAutoPlay();
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(e.clientX);
  };

  const onPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) finishDrag(e.clientX);
  };

  return (
    // Le "rectangle" qui contient le carrousel
    <div
      className="relative w-full h-40 sm:h-56 md:h-72 lg:h-96 overflow-hidden rounded-lg shadow-lg select-none"
      style={{ touchAction: 'pan-y' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
    >
      {items.map((item, index) => (
        <div
          key={item.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
        >
          <img src={item.imageUrl} alt={item.alt} className="w-full h-full object-cover" />
          {/* Superposition pour le texte et le bouton */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex flex-col justify-end">
            <h3 className="text-white font-bold text-lg leading-tight">{item.title}</h3>
            {item.learnMoreUrl && item.learnMoreUrl !== '#' && (
              <a
                href={item.learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white font-semibold text-sm mt-2 self-start bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full hover:bg-white/30 transition-colors"
              >
                Savoir plus
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Indicateurs sous forme de points */}
      {items.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-2">
          {items.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all duration-300 ${index === currentIndex ? 'bg-white scale-125' : 'bg-white/50'
                }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}