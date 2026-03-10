'use client';

import React, { useEffect, useState } from 'react';
import Icon from '@/components/ui/AppIcon';
import AppImage from '@/components/ui/AppImage';

type Language = 'en' | 'fr' | 'ar';

interface HeroSectionProps {
  lang: Language;
}

const heroContent: Record<Language, {
  tagline: string;
  headline: string;
  sub: string;
  appStore: string;
  googlePlay: string;
  scrollHint: string;
  apkDownload: string;
}> = {
  en: {
    tagline: 'Your Trusted Service Platform',
    headline: 'All Your Service\nNeeds in One App',
    sub: 'Connect instantly with verified craftsmen for plumbing, electrical, carpentry, and 9+ home services across Morocco.',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    scrollHint: 'Explore Services',
    apkDownload: 'Download APK Directly'
  },
  fr: {
    tagline: 'Votre Plateforme de Services',
    headline: 'Tous Vos Besoins\nen Une Seule App',
    sub: 'Connectez-vous instantanément avec des artisans vérifiés pour la plomberie, l\'électricité, la menuiserie et plus encore.',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    scrollHint: 'Découvrir les Services',
    apkDownload: 'Télécharger l\'APK Directement'
  },
  ar: {
    tagline: 'منصة خدماتك الموثوقة',
    headline: 'جميع احتياجاتك\nفي تطبيق واحد',
    sub: 'تواصل فوراً مع حرفيين موثوقين للسباكة والكهرباء والنجارة وأكثر من ٩ خدمات منزلية في المغرب.',
    appStore: 'آب ستور',
    googlePlay: 'جوجل بلاي',
    scrollHint: 'استكشف الخدمات',
    apkDownload: 'تحميل APK مباشرة'
  }
};

const bgImages = [
{
  src: "https://img.rocket.new/generatedImages/rocket_gen_img_1bb14f3fd-1772203368182.png",
  alt: 'Plumber working on pipes under a sink'
},
{
  src: "https://images.unsplash.com/photo-1609561515089-91b7fa540820",
  alt: 'Carpenter measuring and cutting wood'
},
{
  src: "https://images.unsplash.com/photo-1615774925655-a0e97fc85c14",
  alt: 'Electrician working on electrical panel'
},
{
  src: "https://img.rocket.new/generatedImages/rocket_gen_img_12e4e4b86-1772470793703.png",
  alt: 'Gardener trimming plants in a garden'
},
{
  src: "https://images.unsplash.com/photo-1718792433064-556a56c76cba",
  alt: 'Painter applying paint to a wall with a roller'
},
{
  src: "https://img.rocket.new/generatedImages/rocket_gen_img_155c89b0b-1770277841375.png",
  alt: 'Construction workers on a building site'
}];


export default function HeroSection({ lang }: HeroSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const t = heroContent[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % bgImages.length);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden animated-gradient-bg"
      dir={isRtl ? 'rtl' : 'ltr'}>
      
      {/* Animated Background Images */}
      <div className="hero-bg">
        {bgImages.map((img, idx) =>
        <AppImage
          key={img.src}
          src={img.src}
          alt={img.alt}
          fill
          className={`hero-bg-image ${idx === activeIndex ? 'active' : ''}`}
          priority={idx === 0} />

        )}
        <div className="hero-overlay" />
      </div>

      {/* Atmospheric blobs */}
      <div
        className="blob-1 opacity-60"
        style={{ top: '10%', left: '-8%' }} />
      
      <div
        className="blob-2 opacity-40"
        style={{ bottom: '15%', right: '-5%' }} />
      

      {/* Content */}
      <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-24 pb-32 flex flex-col items-center text-center">

        {/* Tagline Badge */}
        <div className="glass-card inline-flex items-center gap-2 px-4 py-2 mb-8 text-xs font-semibold uppercase tracking-widest text-blue-bright">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-electric animate-pulse" />
          {t.tagline}
        </div>

        {/* App Name + Headline — main glass card */}
        <div className="glass-card-strong w-full max-w-3xl px-8 py-10 mb-8">
          {/* Vork Logo Name */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #1E88E5 0%, #0A2463 100%)',
                boxShadow: '0 4px 24px rgba(30, 136, 229, 0.4)'
              }}>
              
              <Icon name="WrenchScrewdriverIcon" size={28} className="text-white" variant="solid" />
            </div>
            <span
              className="text-4xl md:text-5xl font-black tracking-tight text-white text-glow"
              style={{ letterSpacing: '-0.03em' }}>
              
              Vork
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ whiteSpace: 'pre-line' }}>
            
            {t.headline}
          </h1>

          {/* Divider */}
          <div className="gradient-line mx-auto w-48 mb-6" />

          {/* Sub */}
          <p className="text-base md:text-lg text-blue-soft/80 leading-relaxed max-w-xl mx-auto">
            {t.sub}
          </p>
        </div>

        {/* Download Buttons — transparent glass */}
        <div className="glass-card px-6 py-5 mb-4 flex flex-col sm:flex-row gap-4 items-center justify-center w-full max-w-md">
          <a href="#download" className="btn-download btn-download-primary glow-pulse w-full sm:w-auto justify-center">
            <Icon name="DevicePhoneMobileIcon" size={20} className="text-white" />
            <div className="text-left">
              <div className="text-[10px] opacity-75 leading-none mb-0.5">Download on the</div>
              <div className="text-sm font-bold leading-none">{t.appStore}</div>
            </div>
          </a>
          <a href="#download" className="btn-download w-full sm:w-auto justify-center">
            <svg className="w-5 h-5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.31.17.67.19 1 .07l11.62-6.7-2.5-2.5L3.18 23.76zM20.4 10.32l-2.77-1.6-2.8 2.8 2.8 2.8 2.8-1.62c.8-.46.8-1.92-.03-2.38zM2.04.24C1.76.56 1.6 1.04 1.6 1.66v20.68c0 .62.16 1.1.44 1.42l.08.07 11.59-11.59v-.27L2.12.17l-.08.07zM14.3 8.27l-2.7-2.7L.98.24C.67.08.31.1 0 .27l10.12 10.12 4.18-2.12z" />
            </svg>
            <div className="text-left">
              <div className="text-[10px] opacity-75 leading-none mb-0.5">Get it on</div>
              <div className="text-sm font-bold leading-none">{t.googlePlay}</div>
            </div>
          </a>
        </div>

        {/* APK Direct Download Button */}
        <div className="mb-8 w-full max-w-md">
          <a
            href="/vork.apk"
            download
            className="btn-download glass-card w-full justify-center border border-blue-electric/40 hover:border-blue-electric/80 transition-all duration-300">
            <Icon name="ArrowDownTrayIcon" size={20} className="text-blue-bright flex-shrink-0" />
            <span className="text-sm font-bold text-blue-bright">{t.apkDownload}</span>
          </a>
        </div>

        {/* Scroll hint */}
        <a
          href="#services"
          className="flex flex-col items-center gap-2 text-blue-soft/50 hover:text-blue-bright transition-colors text-xs font-medium group">
          
          <span>{t.scrollHint}</span>
          <Icon
            name="ChevronDownIcon"
            size={18}
            className="group-hover:translate-y-1 transition-transform duration-300" />
          
        </a>
      </div>

      {/* Image indicator dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
        {bgImages.map((_, idx) =>
        <button
          key={idx}
          onClick={() => setActiveIndex(idx)}
          aria-label={`Background ${idx + 1}`}
          className={`rounded-full transition-all duration-400 ${
          idx === activeIndex ?
          'w-6 h-2 bg-blue-electric' : 'w-2 h-2 bg-blue-soft/30 hover:bg-blue-soft/60'}`
          } />

        )}
      </div>
    </section>);

}