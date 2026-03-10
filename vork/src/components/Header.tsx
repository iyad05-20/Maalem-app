'use client';

import React, { useState, useEffect, useRef } from 'react';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

type Language = 'en' | 'fr' | 'ar';

interface HeaderProps {
  currentLang: Language;
  onLangChange: (lang: Language) => void;
}

const langLabels: Record<Language, { flag: string; label: string; short: string }> = {
  en: { flag: '🇬🇧', label: 'English', short: 'EN' },
  fr: { flag: '🇫🇷', label: 'Français', short: 'FR' },
  ar: { flag: '🇲🇦', label: 'العربية', short: 'AR' },
};

const navLinks: Record<Language, { services: string; howItWorks: string; download: string }> = {
  en: { services: 'Services', howItWorks: 'How It Works', download: 'Download' },
  fr: { services: 'Services', howItWorks: 'Comment ça marche', download: 'Télécharger' },
  ar: { services: 'الخدمات', howItWorks: 'كيف يعمل', download: 'تحميل' },
};

export default function Header({ currentLang, onLangChange }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const t = navLinks[currentLang];
  const isRtl = currentLang === 'ar';

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'glass-nav py-3' : 'py-5'}`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <AppLogo
            size={36}
            text="Vork"
            className="cursor-pointer"
          />
        </div>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a
            href="#services"
            className="text-blue-soft/70 hover:text-blue-bright transition-colors duration-200"
          >
            {t.services}
          </a>
          <a
            href="#how-it-works"
            className="text-blue-soft/70 hover:text-blue-bright transition-colors duration-200"
          >
            {t.howItWorks}
          </a>
          <a
            href="#download"
            className="text-blue-soft/70 hover:text-blue-bright transition-colors duration-200"
          >
            {t.download}
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <div className="lang-dropdown" ref={langRef}>
            <button
              onClick={() => setLangOpen(!langOpen)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-blue-soft/20 bg-navy-mid/20 backdrop-blur-sm hover:border-blue-bright/40 transition-all duration-200 text-sm font-medium text-blue-soft"
              aria-label="Select language"
            >
              <span className="text-base">{langLabels[currentLang].flag}</span>
              <span className="hidden sm:inline">{langLabels[currentLang].short}</span>
              <Icon
                name="ChevronDownIcon"
                size={14}
                className={`text-blue-soft/60 transition-transform duration-200 ${langOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <div className={`lang-menu ${langOpen ? 'open' : ''}`}>
              {(Object.keys(langLabels) as Language[]).map((lang) => (
                <div
                  key={lang}
                  className={`lang-option ${currentLang === lang ? 'active' : ''}`}
                  onClick={() => {
                    onLangChange(lang);
                    setLangOpen(false);
                  }}
                >
                  <span>{langLabels[lang].flag}</span>
                  <span>{langLabels[lang].label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 text-blue-soft/70 hover:text-white transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <Icon name={mobileOpen ? 'XMarkIcon' : 'Bars3Icon'} size={22} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden glass-nav border-t border-blue-soft/10 px-6 py-4 flex flex-col gap-4">
          <a
            href="#services"
            className="text-blue-soft/80 hover:text-white font-medium text-sm"
            onClick={() => setMobileOpen(false)}
          >
            {t.services}
          </a>
          <a
            href="#how-it-works"
            className="text-blue-soft/80 hover:text-white font-medium text-sm"
            onClick={() => setMobileOpen(false)}
          >
            {t.howItWorks}
          </a>
          <a
            href="#download"
            className="text-blue-soft/80 hover:text-white font-medium text-sm"
            onClick={() => setMobileOpen(false)}
          >
            {t.download}
          </a>
        </div>
      )}
    </nav>
  );
}