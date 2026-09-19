import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  ShoppingBag,
  Heart,
  MapPin,
  CreditCard,
  Bell,
  Globe,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { UserProfile } from '../../services/authService';
import type { View } from '../../types';
import { clientWalletAPI } from '../../services/clientWalletApi';
import { useClientI18n } from '../../services/i18n';

interface ProfileViewProps {
  currentUser: UserProfile;
  onLogout: () => void;
  onNavigate: (view: View) => void;
  favoritesCount?: number;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onLogout,
  onNavigate,
  favoritesCount = 0,
}) => {
  const { lang, changeLanguage, t } = useClientI18n();
  const [walletBalance, setWalletBalance] = useState<number>(600);
  const [ordersCount, setOrdersCount] = useState<number>(3);

  useEffect(() => {
    const loadProfileData = async () => {
      try {
        const wallet = await clientWalletAPI.getWallet(currentUser.id || 'client-me');
        setWalletBalance(wallet.balance);
        const orders = await clientWalletAPI.fetchOrders(currentUser.id || 'client-me');
        setOrdersCount(orders.length);
      } catch {
        // Fallback
      }
    };
    loadProfileData();
  }, [currentUser.id]);

  const initials = currentUser.fullName
    ? currentUser.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : currentUser.email.slice(0, 2).toUpperCase();

  return (
    <div className="app-view" style={{ paddingTop: 8 }}>
      {/* ── Profile Header ─────────────────────────────────────────── */}
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 24,
          padding: '24px 20px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-md)',
          marginBottom: 20,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -25,
            right: -25,
            width: 110,
            height: 110,
            borderRadius: '50%',
            background: 'rgba(212, 175, 55, 0.08)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {currentUser.avatarUrl ? (
            <img
              src={currentUser.avatarUrl}
              alt={currentUser.fullName || 'User Avatar'}
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--accent-premium)',
                boxShadow: 'var(--shadow-sm)',
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #1A2A3A 0%, #243447 100%)',
                color: '#D4AF37',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 22,
                border: '2px solid rgba(212, 175, 55, 0.4)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              {initials}
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: 18,
                  color: 'var(--primary)',
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {currentUser.fullName || t('profile_client_privilege')}
              </h2>
              <UserCheck size={16} color="#9CAF88" />
            </div>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'var(--text-secondary)',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {currentUser.email}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(156, 175, 136, 0.15)',
                  color: '#4A7C59',
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.3,
                }}
              >
                <ShieldCheck size={12} /> {t('profile_buyer_verified')}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 12,
                  background: 'rgba(212, 175, 55, 0.12)',
                  color: '#8A6D1C',
                  fontFamily: 'var(--font-body)',
                  fontSize: 10,
                  fontWeight: 600,
                }}
              >
                🔑 JWT Bearer Token
              </span>
            </div>
          </div>
        </div>

        {/* ── Quick Stats Grid ──────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 8,
            marginTop: 20,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
          }}
        >
          <div
            onClick={() => onNavigate('client-wallet')}
            style={{
              textAlign: 'center',
              padding: '10px 4px',
              borderRadius: 14,
              background: 'var(--bg-primary)',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--primary)',
                display: 'block',
              }}
            >
              {walletBalance} <span style={{ fontSize: 10 }}>{t('currency_mad')}</span>
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
              {t('profile_wallet_badge')}
            </span>
          </div>

          <div
            onClick={() => onNavigate('cart')}
            style={{
              textAlign: 'center',
              padding: '10px 4px',
              borderRadius: 14,
              background: 'var(--bg-primary)',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--primary)',
                display: 'block',
              }}
            >
              {ordersCount}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
              {t('profile_orders_count_badge')}
            </span>
          </div>

          <div
            onClick={() => onNavigate('favorites')}
            style={{
              textAlign: 'center',
              padding: '10px 4px',
              borderRadius: 14,
              background: 'var(--bg-primary)',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--primary)',
                display: 'block',
              }}
            >
              {favoritesCount}
            </span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)' }}>
              {t('profile_favorites_count_badge')}
            </span>
          </div>
        </div>
      </div>

      {/* ── Wallet & Finances Banner Card ─────────────────────────── */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        onClick={() => onNavigate('client-wallet')}
        style={{
          background: 'linear-gradient(135deg, #1A2A3A 0%, #243447 100%)',
          borderRadius: 20,
          padding: '18px 20px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          border: '1px solid rgba(212, 175, 55, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: 'rgba(212, 175, 55, 0.15)',
              color: '#D4AF37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={22} />
          </div>
          <div>
            <h4
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: 15,
                color: '#FFFFFF',
                margin: 0,
              }}
            >
              {t('profile_wallet_title')}
            </h4>
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.65)',
                margin: '2px 0 0 0',
              }}
            >
              {t('profile_wallet_sub')} <strong style={{ color: '#D4AF37' }}>{walletBalance} {t('currency_mad')}</strong>
            </p>
          </div>
        </div>
        <ChevronRight size={20} color="rgba(255, 255, 255, 0.6)" />
      </motion.div>

      {/* ── Account Sections List ──────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
          {t('profile_title')}
        </p>

        {/* 1. Suivi Commandes */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('cart')}
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(26, 42, 58, 0.06)', color: 'var(--primary)', display: 'flex', alignItems: "center", justifyContent: "center" }}>
              <ShoppingBag size={18} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--primary)', margin: 0 }}>
                {t('profile_orders')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {t('profile_orders_sub')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </motion.div>

        {/* 2. Favoris */}
        <motion.div
          whileTap={{ scale: 0.98 }}
          onClick={() => onNavigate('favorites')}
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(204, 119, 85, 0.1)', color: '#CC7755', display: 'flex', alignItems: "center", justifyContent: "center" }}>
              <Heart size={18} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--primary)', margin: 0 }}>
                {t('profile_favorites')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {favoritesCount} {favoritesCount > 1 ? t('profile_favorites_sub_multi') : t('profile_favorites_sub_single')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </motion.div>

        {/* 3. Adresses de livraison */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(156, 175, 136, 0.12)', color: '#4A7C59', display: 'flex', alignItems: "center", justifyContent: "center" }}>
              <MapPin size={18} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--primary)', margin: 0 }}>
                {t('profile_addresses')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {t('profile_addresses_sub')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </div>

        {/* 4. Cartes & CMI */}
        <div
          style={{
            background: 'var(--surface)',
            borderRadius: 16,
            padding: '14px 16px',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(212, 175, 55, 0.12)', color: '#8B6914', display: 'flex', alignItems: "center", justifyContent: "center" }}>
              <CreditCard size={18} />
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, color: 'var(--primary)', margin: 0 }}>
                {t('profile_cmi')}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: 11, color: 'var(--text-secondary)', margin: 0 }}>
                {t('profile_cmi_sub')}
              </p>
            </div>
          </div>
          <ChevronRight size={18} color="var(--text-secondary)" />
        </div>
      </div>

      {/* ── Preferences Section ────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
          {t('profile_preferences_title')}
        </p>

        {/* ── Interactive Language Switcher ── */}
        <div 
          onClick={() => changeLanguage(lang === 'ar' ? 'fr' : 'ar')}
          style={{ 
            background: 'var(--surface)', 
            borderRadius: 16, 
            padding: '14px 16px', 
            border: '1px solid rgba(212, 175, 55, 0.4)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(212,175,55,0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Globe size={18} color="#D4AF37" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--primary)', fontWeight: 600 }}>
              {t('profile_language')}
            </span>
          </div>
          <span style={{ 
            fontFamily: 'var(--font-body)', 
            fontSize: 12, 
            fontWeight: 700, 
            color: '#1A2A3A', 
            background: 'rgba(212, 175, 55, 0.2)', 
            padding: '4px 10px', 
            borderRadius: 8,
            border: '1px solid rgba(212, 175, 55, 0.35)'
          }}>
            {t('profile_lang_toggle_btn')}
          </span>
        </div>

        <div style={{ background: 'var(--surface)', borderRadius: 16, padding: '14px 16px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Bell size={18} color="var(--text-secondary)" />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--primary)', fontWeight: 500 }}>
              {t('profile_notifications')}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 700, color: '#4A7C59', background: 'rgba(156,175,136,0.15)', padding: '2px 8px', borderRadius: 10 }}>
            {lang === 'ar' ? 'مفعلة' : 'Activées'}
          </span>
        </div>
      </div>

      {/* ── Logout Button ─────────────────────────────────────────── */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onLogout}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 16,
          background: 'rgba(220, 53, 69, 0.08)',
          color: '#DC3545',
          border: '1px solid rgba(220, 53, 69, 0.25)',
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          marginBottom: 20,
        }}
      >
        <LogOut size={18} /> {t('profile_logout')}
      </motion.button>
    </div>
  );
};
