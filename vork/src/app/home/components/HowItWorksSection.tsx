'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

type Language = 'en' | 'fr' | 'ar';

interface HowItWorksSectionProps {
  lang: Language;
}

const content: Record<Language, {
  label: string;
  heading: string;
  steps: { num: string; title: string; desc: string; icon: string }[];
}> = {
  en: {
    label: 'Simple Process',
    heading: 'Book a Craftsman in 3 Steps',
    steps: [
      {
        num: '01',
        title: 'Choose Your Service',
        desc: 'Browse 9+ service categories and describe what you need. No long forms — just a quick request.',
        icon: 'MagnifyingGlassIcon',
      },
      {
        num: '02',
        title: 'Get Matched Instantly',
        desc: 'Our system connects you with verified, nearby craftsmen in under 2 minutes. See ratings and reviews.',
        icon: 'UserGroupIcon',
      },
      {
        num: '03',
        title: 'Job Done, Guaranteed',
        desc: 'Your craftsman arrives on time. Pay securely through the app after the job is completed to your satisfaction.',
        icon: 'CheckBadgeIcon',
      },
    ],
  },
  fr: {
    label: 'Processus Simple',
    heading: 'Réservez un Artisan en 3 Étapes',
    steps: [
      {
        num: '01',
        title: 'Choisissez Votre Service',
        desc: 'Parcourez plus de 9 catégories et décrivez votre besoin. Pas de formulaires longs — juste une demande rapide.',
        icon: 'MagnifyingGlassIcon',
      },
      {
        num: '02',
        title: 'Mise en Relation Instantanée',
        desc: 'Notre système vous connecte avec des artisans vérifiés à proximité en moins de 2 minutes.',
        icon: 'UserGroupIcon',
      },
      {
        num: '03',
        title: 'Travail Fait, Garanti',
        desc: 'Votre artisan arrive à l\'heure. Payez en toute sécurité via l\'application après satisfaction.',
        icon: 'CheckBadgeIcon',
      },
    ],
  },
  ar: {
    label: 'عملية بسيطة',
    heading: 'احجز حرفياً في ٣ خطوات',
    steps: [
      {
        num: '٠١',
        title: 'اختر خدمتك',
        desc: 'تصفح أكثر من ٩ فئات خدمات وصف ما تحتاجه. بدون نماذج طويلة — مجرد طلب سريع.',
        icon: 'MagnifyingGlassIcon',
      },
      {
        num: '٠٢',
        title: 'مطابقة فورية',
        desc: 'يربطك نظامنا بحرفيين موثوقين قريبين منك في أقل من دقيقتين. اطلع على التقييمات والمراجعات.',
        icon: 'UserGroupIcon',
      },
      {
        num: '٠٣',
        title: 'العمل منجز، مضمون',
        desc: 'يصل حرفيك في الوقت المحدد. ادفع بأمان عبر التطبيق بعد إنجاز العمل بما يرضيك.',
        icon: 'CheckBadgeIcon',
      },
    ],
  },
};

export default function HowItWorksSection({ lang }: HowItWorksSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const t = content[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.12 }
    );
    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      ref={sectionRef}
      className="relative py-24 px-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-electric mb-4 px-4 py-1.5 rounded-full border border-blue-electric/30 bg-blue-electric/10">
            {t.label}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            {t.heading}
          </h2>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {t.steps.map((step, idx) => (
            <div
              key={step.num}
              className={`step-card reveal reveal-delay-${idx + 1} p-8 group hover:border-blue-bright/30 transition-all duration-300`}
            >
              <span className="step-number">{step.num}</span>

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, rgba(30,136,229,0.25) 0%, rgba(10,36,99,0.4) 100%)',
                  border: '1px solid rgba(66,165,245,0.3)',
                }}
              >
                <Icon
                  name={step.icon as Parameters<typeof Icon>[0]['name']}
                  size={22}
                  className="text-blue-bright"
                />
              </div>

              <h3 className="text-xl font-bold text-white mb-3 relative z-10">
                {step.title}
              </h3>
              <p className="text-blue-soft/65 text-sm leading-relaxed relative z-10">
                {step.desc}
              </p>

              {/* Connector arrow (not on last) */}
              {idx < t.steps.length - 1 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-20">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: 'rgba(30,136,229,0.2)',
                      border: '1px solid rgba(66,165,245,0.3)',
                    }}
                  >
                    <Icon name="ChevronRightIcon" size={12} className="text-blue-bright" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}