import React from 'react';

interface ChapterHeaderProps {
  title: string;
  subtitle?: string;
  hasAccentBar?: boolean;
  discreetBadge?: string;
  linkLabel?: string;
  onLinkClick?: () => void;
  icon?: React.ReactNode;
}

export const ChapterHeader: React.FC<ChapterHeaderProps> = ({
  title,
  subtitle,
  hasAccentBar = false,
  discreetBadge,
  linkLabel,
  onLinkClick,
  icon,
}) => {
  return (
    <div className={`chapter-header ${hasAccentBar ? 'has-accent-bar' : ''}`}>
      <div className="chapter-header-main">
        {discreetBadge && (
          <div className="chapter-discreet-badge">
            {icon}
            <span>{discreetBadge}</span>
          </div>
        )}
        <h3 className="chapter-title">{title}</h3>
        {subtitle && <p className="chapter-subtitle">{subtitle}</p>}
      </div>
      {linkLabel && (
        <button className="chapter-link-btn" onClick={onLinkClick}>
          {linkLabel}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
};
