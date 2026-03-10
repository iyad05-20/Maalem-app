'use client';

import React, { useEffect, useRef, useState } from 'react';


type Language = 'en' | 'fr' | 'ar';

interface StatsSectionProps {
  lang: Language;
}

const statsContent: Record<Language, {
  label: string;
  heading: string;
  stats: { value: string; suffix: string; desc: string; icon: string }[];
}> = {
  en: {
    label: 'Trusted by Thousands',
    heading: 'The Numbers Speak',
    stats: [
      { value: '1200', suffix: '+', desc: 'Verified Craftsmen', icon: 'UserGroupIcon' },
      { value: '15000', suffix: '+', desc: 'Jobs Completed', icon: 'CheckBadgeIcon' },
      { value: '12', suffix: '', desc: 'Cities Covered', icon: 'MapPinIcon' },
      { value: '4.8', suffix: '★', desc: 'Average App Rating', icon: 'StarIcon' },
    ],
  },
  fr: {
    label: 'Approuvé par des Milliers',
    heading: 'Les Chiffres Parlent',
    stats: [
      { value: '1200', suffix: '+', desc: 'Artisans Vérifiés', icon: 'UserGroupIcon' },
      { value: '15000', suffix: '+', desc: 'Missions Réalisées', icon: 'CheckBadgeIcon' },
      { value: '12', suffix: '', desc: 'Villes Couvertes', icon: 'MapPinIcon' },
      { value: '4.8', suffix: '★', desc: 'Note Moyenne App', icon: 'StarIcon' },
    ],
  },
  ar: {
    label: 'موثوق من الآلاف',
    heading: 'الأرقام تتحدث',
    stats: [
      { value: '١٢٠٠', suffix: '+', desc: 'حرفي موثوق', icon: 'UserGroupIcon' },
      { value: '١٥٠٠٠', suffix: '+', desc: 'مهمة منجزة', icon: 'CheckBadgeIcon' },
      { value: '١٢', suffix: '', desc: 'مدينة مغطاة', icon: 'MapPinIcon' },
      { value: '٤.٨', suffix: '★', desc: 'متوسط تقييم التطبيق', icon: 'StarIcon' },
    ],
  },
};

function AnimatedNumber({ target, suffix }: { target: string; suffix: string }) {
  const [display, setDisplay] = useState('0');
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const numericTarget = parseFloat(target.replace(/[^\d.]/g, ''));
    if (isNaN(numericTarget)) {
      setDisplay(target);
      return;
    }
    const duration = 1800;
    const start = performance.now();
    const isDecimal = target.includes('.');

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericTarget * eased;
      setDisplay(isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString());
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [started, target]);

  return (
    <span ref={ref}>
      {display}{suffix}
    </span>
  );
}

export default function StatsSection({ lang }: StatsSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const t = statsContent[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.1 }
    );
    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative py-20 px-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Gradient line separator */}
      <div className="gradient-line mb-16 max-w-3xl mx-auto" />

      <div className="gradient-line mt-16 max-w-3xl mx-auto" />
    </section>
  );
}