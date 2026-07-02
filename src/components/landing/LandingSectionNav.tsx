'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'framer-motion';

export type LandingSectionNavItem = {
  id: string;
  label: string;
  num?: string;
  kind?: 'top' | 'section' | 'cta';
};

type Props = {
  items: LandingSectionNavItem[];
};

export function LandingSectionNav({ items }: Props) {
  const [activeId, setActiveId] = useState('top');
  const clickLockRef = useRef(false);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sectionIds = useMemo(
    () => items.filter((i) => i.kind === 'section' || i.kind === 'cta').map((i) => i.id),
    [items],
  );

  useEffect(() => {
    const onScroll = () => {
      if (clickLockRef.current) return;
      if (window.scrollY < 160) {
        setActiveId('top');
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => !!el);

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (clickLockRef.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible[0]?.target?.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-12% 0px -52% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75],
      },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  const handleNavigate = useCallback((item: LandingSectionNavItem) => {
    setActiveId(item.id);
    clickLockRef.current = true;
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

    if (item.id === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    clickTimerRef.current = setTimeout(() => {
      clickLockRef.current = false;
    }, 900);
  }, []);

  useEffect(() => {
    return () => {
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    };
  }, []);

  return (
    <nav
      className="fixed bottom-6 right-4 sm:right-6 z-50 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#bdc9c5]/50 shadow-[0_8px_32px_rgba(0,107,92,0.14)] overflow-hidden isolate"
      aria-label="페이지 섹션 바로가기"
    >
      <LayoutGroup id="landing-section-nav">
        <div className="flex flex-col gap-1 p-2">
          {items.map((item) => {
            const isActive = activeId === item.id;
            const isCta = item.kind === 'cta';
            const isTop = item.kind === 'top';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item)}
                title={item.label}
                aria-current={isActive ? 'true' : undefined}
                className={`group relative flex items-center justify-end rounded-xl transition-colors ${
                  isCta ? 'mt-1 pt-2 border-t border-[#bdc9c5]/40' : ''
                }`}
              >
                {/* 호버·활성 라벨 */}
                <span
                  className={`pointer-events-none absolute right-full mr-2 px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shadow-md transition-all duration-300 ${
                    isActive
                      ? 'opacity-100 translate-x-0'
                      : 'opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
                  } ${
                    isCta && isActive
                      ? 'bg-[#006b5c] text-white'
                      : isCta
                        ? 'bg-[#1b1c1b] text-white'
                        : isActive
                          ? 'bg-[#006b5c] text-white'
                          : 'bg-[#1b1c1b] text-white'
                  }`}
                >
                  {item.label}
                </span>

                <span className="relative flex h-9 min-w-[2.25rem] items-center justify-center">
                  {isActive && (
                    <motion.span
                      layoutId="landing-section-nav-active"
                      className={`absolute inset-0 rounded-xl ${
                        isCta
                          ? 'bg-gradient-to-br from-[#006b5c] to-[#005a4d]'
                          : 'bg-[#006b5c]'
                      }`}
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}

                  {isTop ? (
                    <span
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'bg-[#006b5c]/10 text-[#006b5c] group-hover:bg-[#006b5c] group-hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                    </span>
                  ) : isCta ? (
                    <span
                      className={`relative z-10 flex h-9 min-w-[3.25rem] items-center justify-center rounded-xl px-2 text-[10px] font-black tracking-wide transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'bg-gradient-to-br from-[#86e3ce] to-[#6bc4b0] text-[#004d40] group-hover:text-white'
                      }`}
                    >
                      Apply
                    </span>
                  ) : (
                    <span
                      className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl text-[10px] font-black tracking-tighter transition-colors ${
                        isActive
                          ? 'text-white'
                          : 'bg-[#f0eeec] text-[#3e4946] group-hover:bg-[#006b5c] group-hover:text-white'
                      }`}
                    >
                      {item.num}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
