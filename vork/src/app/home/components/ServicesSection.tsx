'use client';

import React, { useEffect, useRef } from 'react';
import Icon from '@/components/ui/AppIcon';

type Language = 'en' | 'fr' | 'ar';

interface ServicesSectionProps {
  lang: Language;
}

interface ServiceItem {
  icon: string;
  nameEn: string;
  nameFr: string;
  nameAr: string;
  descEn: string;
  descFr: string;
  descAr: string;
  color: string;
  gradient: string;
}

const services: ServiceItem[] = [
  {
    icon: 'WrenchIcon',
    nameEn: 'Plumbing',
    nameFr: 'Plomberie',
    nameAr: 'السباكة',
    descEn: 'Pipe repairs, leak fixes, installation & emergency water services.',
    descFr: 'Réparations de tuyaux, fuites, installation et urgences.',
    descAr: 'إصلاح الأنابيب، تسريبات المياه، والتركيبات الطارئة.',
    color: '#1E88E5',
    gradient: 'from-blue-500/20 to-blue-700/5',
  },
  {
    icon: 'BoltIcon',
    nameEn: 'Electrical',
    nameFr: 'Électricité',
    nameAr: 'الكهرباء',
    descEn: 'Wiring, panel upgrades, lighting installation & fault diagnosis.',
    descFr: 'Câblage, tableaux électriques, éclairage et diagnostic.',
    descAr: 'أسلاك كهربائية، تركيب الإضاءة وتشخيص الأعطال.',
    color: '#FFB300',
    gradient: 'from-yellow-500/20 to-yellow-700/5',
  },
  {
    icon: 'CubeIcon',
    nameEn: 'Carpentry',
    nameFr: 'Menuiserie',
    nameAr: 'النجارة',
    descEn: 'Custom furniture, door fitting, shelving & wood restoration.',
    descFr: 'Meubles sur mesure, portes, étagères et restauration bois.',
    descAr: 'أثاث مخصص، تركيب الأبواب والرفوف وترميم الخشب.',
    color: '#8D6E63',
    gradient: 'from-amber-700/20 to-amber-900/5',
  },
  {
    icon: 'SparklesIcon',
    nameEn: 'Cleaning',
    nameFr: 'Nettoyage',
    nameAr: 'التنظيف',
    descEn: 'Deep cleaning, post-construction cleanup & regular housekeeping.',
    descFr: 'Nettoyage en profondeur, post-chantier et ménage régulier.',
    descAr: 'تنظيف عميق، ما بعد البناء والتنظيف المنتظم.',
    color: '#26C6DA',
    gradient: 'from-cyan-400/20 to-cyan-600/5',
  },
  {
    icon: 'SunIcon',
    nameEn: 'Gardening',
    nameFr: 'Jardinage',
    nameAr: 'البستنة',
    descEn: 'Lawn care, tree trimming, irrigation & landscape design.',
    descFr: 'Entretien pelouse, taille, irrigation et paysagisme.',
    descAr: 'رعاية العشب، تقليم الأشجار والتصميم المشهدي.',
    color: '#43A047',
    gradient: 'from-green-500/20 to-green-700/5',
  },
  {
    icon: 'HomeModernIcon',
    nameEn: 'Construction',
    nameFr: 'Construction',
    nameAr: 'البناء',
    descEn: 'Renovations, extensions, masonry & structural improvements.',
    descFr: 'Rénovations, extensions, maçonnerie et améliorations.',
    descAr: 'تجديدات، توسعات، بناء وتحسينات هيكلية.',
    color: '#EF5350',
    gradient: 'from-red-500/20 to-red-700/5',
  },
  {
    icon: 'PaintBrushIcon',
    nameEn: 'Painting',
    nameFr: 'Peinture',
    nameAr: 'الدهانات',
    descEn: 'Interior & exterior painting, texture finishes & wall prep.',
    descFr: 'Peinture intérieure/extérieure, textures et préparation.',
    descAr: 'طلاء داخلي وخارجي، تشطيبات الملمس وتحضير الجدران.',
    color: '#AB47BC',
    gradient: 'from-purple-500/20 to-purple-700/5',
  },
  {
    icon: 'CloudIcon',
    nameEn: 'Air Conditioning',
    nameFr: 'Climatisation',
    nameAr: 'التكييف',
    descEn: 'AC installation, servicing, cleaning & refrigerant refills.',
    descFr: 'Installation, entretien, nettoyage et recharge de climatiseurs.',
    descAr: 'تركيب وصيانة وتنظيف المكيفات وإعادة الشحن.',
    color: '#29B6F6',
    gradient: 'from-sky-400/20 to-sky-600/5',
  },
  {
    icon: 'SquaresPlusIcon',
    nameEn: 'Zellij',
    nameFr: 'Zellij',
    nameAr: 'الزليج',
    descEn: 'Traditional Moroccan mosaic tile art for floors, walls & fountains.',
    descFr: 'Mosaïque marocaine traditionnelle pour sols, murs et fontaines.',
    descAr: 'فن الزليج المغربي التقليدي للأرضيات والجدران والنوافير.',
    color: '#FF7043',
    gradient: 'from-orange-500/20 to-orange-700/5',
  },
];

const sectionTitle: Record<Language, { label: string; heading: string; sub: string }> = {
  en: {
    label: 'What We Offer',
    heading: 'Every Service You Need',
    sub: 'From emergency repairs to artistic craftsmanship — Vork connects you with the right professional, every time.',
  },
  fr: {
    label: 'Ce Que Nous Offrons',
    heading: 'Tous les Services dont Vous Avez Besoin',
    sub: "Des réparations d'urgence à l'artisanat artistique — Vork vous connecte avec le bon professionnel, à chaque fois.",
  },
  ar: {
    label: 'ما نقدمه',
    heading: 'كل خدمة تحتاجها',
    sub: 'من الإصلاحات الطارئة إلى الحرف الفنية — يربطك Vork بالمحترف المناسب في كل مرة.',
  },
};

export default function ServicesSection({ lang }: ServicesSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const t = sectionTitle[lang];
  const isRtl = lang === 'ar';

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.08 }
    );

    const reveals = sectionRef.current?.querySelectorAll('.reveal');
    reveals?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const getName = (s: ServiceItem) =>
    lang === 'fr' ? s.nameFr : lang === 'ar' ? s.nameAr : s.nameEn;
  const getDesc = (s: ServiceItem) =>
    lang === 'fr' ? s.descFr : lang === 'ar' ? s.descAr : s.descEn;

  return (
    <section
      id="services"
      ref={sectionRef}
      className="relative py-28 px-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Atmospheric blob */}
      <div
        className="blob-1 opacity-20 pointer-events-none"
        style={{ top: '20%', right: '-10%' }}
      />

      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 reveal">
          <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-electric mb-4 px-4 py-1.5 rounded-full border border-blue-electric/30 bg-blue-electric/10">
            {t.label}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-5 leading-tight">
            {t.heading}
          </h2>
          <p className="text-blue-soft/70 text-lg max-w-2xl mx-auto leading-relaxed">
            {t.sub}
          </p>
        </div>

        {/* Outer glass container */}
        <div className="glass-card-strong p-6 md:p-10 reveal reveal-delay-1">
          {/* Uniform 3-column grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {services.map((service, idx) => (
              <div
                key={service.nameEn}
                className={`service-card-v2 reveal reveal-delay-${Math.min(idx + 1, 6)}`}
                style={{
                  borderTopColor: service.color,
                }}
              >
                {/* Top accent bar */}
                <div
                  className="service-card-v2-bar"
                  style={{ background: `linear-gradient(90deg, ${service.color}, transparent)` }}
                />

                {/* Icon + Name row */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="service-icon-v2"
                    style={{
                      background: `linear-gradient(135deg, ${service.color}28 0%, ${service.color}0d 100%)`,
                      boxShadow: `0 0 0 1px ${service.color}33`,
                    }}
                  >
                    <Icon
                      name={service.icon as Parameters<typeof Icon>[0]['name']}
                      size={22}
                      style={{ color: service.color }}
                    />
                  </div>
                  <h3 className="font-semibold text-white text-base tracking-wide">
                    {getName(service)}
                  </h3>
                </div>

                {/* Divider */}
                <div
                  className="h-px mb-3 rounded-full"
                  style={{ background: `linear-gradient(90deg, ${service.color}40, transparent)` }}
                />

                {/* Description */}
                <p className="text-blue-soft/60 text-sm leading-relaxed">
                  {getDesc(service)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}