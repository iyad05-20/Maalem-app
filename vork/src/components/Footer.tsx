import React from 'react';
import AppLogo from '@/components/ui/AppLogo';
import Icon from '@/components/ui/AppIcon';

type Language = 'en' | 'fr' | 'ar';

interface FooterProps {
  lang: Language;
}

const footerText: Record<Language, { privacy: string; terms: string; copy: string }> = {
  en: { privacy: 'Privacy', terms: 'Terms', copy: '© 2026 Vork. All rights reserved.' },
  fr: { privacy: 'Confidentialité', terms: 'Conditions', copy: '© 2026 Vork. Tous droits réservés.' },
  ar: { privacy: 'الخصوصية', terms: 'الشروط', copy: '© 2026 Vork. جميع الحقوق محفوظة.' },
};

export default function Footer({ lang }: FooterProps) {
  const t = footerText[lang];
  const isRtl = lang === 'ar';

  return (
    <footer
      className="border-t border-blue-soft/10 py-8"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Logo + copyright */}
        <div className="flex items-center gap-3">
          <AppLogo size={28} text="Vork" />
          <span className="text-blue-soft/40 text-sm">{t.copy}</span>
        </div>

        {/* Links + socials */}
        <div className="flex items-center gap-6">
          <a href="#" className="text-blue-soft/50 hover:text-blue-bright text-sm font-medium transition-colors">
            {t.privacy}
          </a>
          <a href="#" className="text-blue-soft/50 hover:text-blue-bright text-sm font-medium transition-colors">
            {t.terms}
          </a>
          <div className="flex items-center gap-3">
            <a href="#" aria-label="Instagram" className="text-blue-soft/40 hover:text-blue-bright transition-colors">
              <Icon name="GlobeAltIcon" size={18} />
            </a>
            <a href="#" aria-label="Twitter" className="text-blue-soft/40 hover:text-blue-bright transition-colors">
              <Icon name="ChatBubbleLeftRightIcon" size={18} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}