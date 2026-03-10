'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';


type Language = 'en' | 'fr' | 'ar';

interface DownloadSectionProps {
  lang: Language;
}

const content: Record<Language, {
  label: string;
  heading: string;
  sub: string;
  appStore: string;
  googlePlay: string;
  note: string;
  apkDownload: string;
  apkSub: string;
}> = {
  en: {
    label: 'Download Now',
    heading: 'Get Vork Today.\nStart in Minutes.',
    sub: 'Join thousands of Moroccan homeowners who book trusted craftsmen without the hassle. Free download, no subscription.',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    note: 'Available for iOS 14+ and Android 8.0+',
    apkDownload: 'Download APK Directly',
    apkSub: 'Android APK file',
  },
  fr: {
    label: 'Télécharger Maintenant',
    heading: 'Obtenez Vork Aujourd\'hui.\nDémarrez en Minutes.',
    sub: 'Rejoignez des milliers de propriétaires qui réservent des artisans de confiance sans tracas. Téléchargement gratuit, sans abonnement.',
    appStore: 'App Store',
    googlePlay: 'Google Play',
    note: 'Disponible pour iOS 14+ et Android 8.0+',
    apkDownload: 'Télécharger l\'APK Directement',
    apkSub: 'Fichier APK Android',
  },
  ar: {
    label: 'حمّل الآن',
    heading: 'احصل على Vork اليوم.\nابدأ في دقائق.',
    sub: 'انضم إلى آلاف أصحاب المنازل المغاربة الذين يحجزون حرفيين موثوقين بسهولة. تحميل مجاني، بدون اشتراك.',
    appStore: 'آب ستور',
    googlePlay: 'جوجل بلاي',
    note: 'متاح لـ iOS 14+ و Android 8.0+',
    apkDownload: 'تحميل APK مباشرة',
    apkSub: 'ملف APK لأندرويد',
  },
};

export default function DownloadSection({ lang }: DownloadSectionProps) {
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
      { threshold: 0.15 }
    );
    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="download"
      ref={sectionRef}
      className="relative py-24 px-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Background blob */}
      <div
        className="blob-1 opacity-30 pointer-events-none"
        style={{ top: '0%', left: '50%', transform: 'translateX(-50%)' }}
      />

      <div className="max-w-4xl mx-auto">
        <div className="glass-card-strong p-10 md:p-16 text-center reveal">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center glow-pulse"
              style={{
                background: 'linear-gradient(135deg, #1E88E5 0%, #0A2463 100%)',
                boxShadow: '0 8px 40px rgba(30, 136, 229, 0.4)',
              }}
            >
              <Icon name="WrenchScrewdriverIcon" size={36} className="text-white" variant="solid" />
            </div>
          </div>

          {/* Badge */}
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-electric mb-6 px-4 py-1.5 rounded-full border border-blue-electric/30 bg-blue-electric/10">
            {t.label}
          </span>

          {/* Heading */}
          <h2
            className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight"
            style={{ whiteSpace: 'pre-line' }}
          >
            {t.heading}
          </h2>

          <div className="gradient-line w-48 mx-auto mb-6" />

          {/* Sub */}
          <p className="text-blue-soft/75 text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            {t.sub}
          </p>

          {/* Download Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
            {/* App Store */}
            <a
              href="#"
              className="btn-download btn-download-primary glow-pulse w-full sm:w-auto justify-center"
              style={{ minWidth: 200 }}
            >
              <Icon name="DevicePhoneMobileIcon" size={22} className="text-white flex-shrink-0" />
              <div className="text-left">
                <div className="text-[10px] opacity-75 leading-none mb-0.5">Download on the</div>
                <div className="text-base font-bold leading-none">{t.appStore}</div>
              </div>
            </a>

            {/* Google Play */}
            <a
              href="#"
              className="btn-download w-full sm:w-auto justify-center"
              style={{ minWidth: 200 }}
            >
              <svg className="w-5 h-5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76c.31.17.67.19 1 .07l11.62-6.7-2.5-2.5L3.18 23.76zM20.4 10.32l-2.77-1.6-2.8 2.8 2.8 2.8 2.8-1.62c.8-.46.8-1.92-.03-2.38zM2.04.24C1.76.56 1.6 1.04 1.6 1.66v20.68c0 .62.16 1.1.44 1.42l.08.07 11.59-11.59v-.27L2.12.17l-.08.07zM14.3 8.27l-2.7-2.7L.98.24C.67.08.31.1 0 .27l10.12 10.12 4.18-2.12z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] opacity-75 leading-none mb-0.5">Get it on</div>
                <div className="text-base font-bold leading-none">{t.googlePlay}</div>
              </div>
            </a>
          </div>

          {/* APK Download Button */}
          <div className="flex justify-center mb-6">
            <a
              href="/vork.apk"
              download
              className="btn-download w-full sm:w-auto justify-center"
              style={{ minWidth: 200, borderColor: 'rgba(30,136,229,0.5)', background: 'rgba(30,136,229,0.08)' }}
            >
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 16l-5-5h3V4h4v7h3l-5 5zm-7 4h14v-2H5v2z" />
              </svg>
              <div className="text-left">
                <div className="text-[10px] opacity-75 leading-none mb-0.5">{t.apkSub}</div>
                <div className="text-base font-bold leading-none">{t.apkDownload}</div>
              </div>
            </a>
          </div>

          {/* Note */}
          <p className="text-blue-soft/40 text-sm">{t.note}</p>
        </div>
      </div>
    </section>
  );
}