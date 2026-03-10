'use client';

import React, { useState } from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import ServicesSection from './components/ServicesSection';
import HowItWorksSection from './components/HowItWorksSection';
import StatsSection from './components/StatsSection';
import DownloadSection from './components/DownloadSection';

type Language = 'en' | 'fr' | 'ar';

export default function HomePage() {
  const [lang, setLang] = useState<Language>('en');

  return (
    <div className="min-h-screen animated-gradient-bg relative">
      {/* Noise texture overlay for premium feel */}
      <div className="noise-overlay" aria-hidden="true" />

      {/* Header */}
      <Header currentLang={lang} onLangChange={setLang} />

      {/* Main content */}
      <main>
        {/* Hero — Animated craftsmen background + glassmorphic CTA */}
        <HeroSection lang={lang} />

        {/* Services — 9-service bento glass grid */}
        <ServicesSection lang={lang} />

        {/* How It Works — 3-step visual */}
        <HowItWorksSection lang={lang} />

        {/* Stats — animated counters */}
        <StatsSection lang={lang} />

        {/* Download CTA */}
        <DownloadSection lang={lang} />
      </main>

      {/* Footer */}
      <Footer lang={lang} />
    </div>
  );
}