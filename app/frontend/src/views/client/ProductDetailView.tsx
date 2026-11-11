import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Heart, Shield, ArrowRight, MessageSquare, Edit3, Flag, Sparkles } from 'lucide-react';
import type { Product, View } from '../../types';
import { recSession } from '../../services/recommendationSession';
import { reviewsService, type Review } from '../../services/reviewsService';
import { clientWalletAPI } from '../../services/clientWalletApi';
import { LuxuryStockBadge } from '../../components/Shared/LuxuryStockBadge';
import { ReportModal } from '../../components/Shared/ReportModal';

interface ProductDetailViewProps {
  product: Product;
  onClose: () => void;
  onNavigate: (view: View) => void;
  setActiveOrderId: (orderId: string) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (product: Product) => void;
  currentUser?: any;
}

const getFallbackImage = (category_group?: string) => {
  const images: Record<string, string> = {
    bijouterie: 'https://images.unsplash.com/photo-1599643478524-fb66f70d00f0?w=500&q=80',
    ceramique: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
    dinanderie: 'https://images.unsplash.com/photo-1577907577587-f70b7794bfa2?w=500&q=80',
    broderie: 'https://images.unsplash.com/photo-1605276374104-a628b0fae742?w=500&q=80',
    tissage: 'https://images.unsplash.com/photo-1574635882662-7e0e7a2b9d0b?w=500&q=80',
    maroquinerie: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80',
    menuiserie: 'https://images.unsplash.com/photo-1582260655353-83802ceafc0c?w=500&q=80',
  };
  return (category_group && images[category_group]) || 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80';
};

const normalizeList = (val: any): string[] => {
  if (Array.isArray(val)) return Array.from(new Set(val.map((x) => String(x || '').trim()).filter(Boolean)));
  if (typeof val === 'string' && val.trim()) return Array.from(new Set(val.split(',').map((x) => x.trim()).filter(Boolean)));
  return [];
};

const extractProductTags = (p: any): string[] => {
  const tags: string[] = [];
  if (Array.isArray(p.tags)) tags.push(...p.tags);
  if (Array.isArray(p.identity?.tags)) tags.push(...p.identity.tags);
  if (p.rec_tags) {
    if (Array.isArray(p.rec_tags.style)) tags.push(...p.rec_tags.style);
    if (Array.isArray(p.rec_tags.material)) tags.push(...p.rec_tags.material);
    if (Array.isArray(p.rec_tags.color_vibe)) tags.push(...p.rec_tags.color_vibe);
    if (Array.isArray(p.rec_tags.custom)) tags.push(...p.rec_tags.custom);
  }
  if (p.category_group) tags.push(p.category_group);
  if (p.identity?.category_group) tags.push(p.identity.category_group);
  return Array.from(new Set(tags.map((t) => String(t || '').trim()).filter(Boolean)));
};

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  product,
  onClose,
  onNavigate,
  setActiveOrderId,
  isFavorite,
  onToggleFavorite,
  currentUser,
}) => {
  const [isFav, setIsFav] = useState(isFavorite || false);
  const [isOrdering, setIsOrdering] = useState(false);
  
  // Reviews state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const tags = extractProductTags(product);
  const priceVal = typeof product.price === 'string'
    ? parseFloat(product.price.replace(/[^\d]/g, '')) || 450
    : (product.price as any || 450);

  const pAny = product as any;
  const photos = normalizeList([
    ...(normalizeList(pAny.photos || pAny.images || pAny.identity?.photos)),
    product.image || pAny.image_url || pAny.imageUrl || getFallbackImage(product.category),
  ]);
  const sizes = normalizeList(pAny.sizes || pAny.identity?.sizes || pAny.facets?.sizes);
  const colors = normalizeList(pAny.colors || pAny.identity?.colors || pAny.facets?.colors);

  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(sizes[0] || '');
  const [selectedColor, setSelectedColor] = useState<string>(colors[0] || '');

  useEffect(() => {
    setActivePhotoIdx(0);
    setSelectedSize(sizes[0] || '');
    setSelectedColor(colors[0] || '');
  }, [product.id]);

  const currentStock = typeof pAny.stock === 'number' ? pAny.stock : undefined;
  const initialStock = typeof pAny.initialStock === 'number' ? pAny.initialStock : (typeof pAny.initial_stock === 'number' ? pAny.initial_stock : currentStock);
  const isOutOfStock = Boolean(pAny.isOutOfStock || pAny.is_out_of_stock || (typeof currentStock === 'number' && currentStock <= 0));
  const stockPolicy = pAny.stockPolicy || pAny.stock_policy || {};
  const allowOrderExceedingStock = Boolean(stockPolicy.allowOrderExceedingStock ?? stockPolicy.allow_order_exceeding_stock ?? true);
  const isOnDemandProductType = Boolean(pAny.isOnDemand || pAny.productType === 'sur_commande' || pAny.identity?.product_type === 'sur_commande');
  const isStrictOutOfStock = !isOnDemandProductType && isOutOfStock && !allowOrderExceedingStock;
  const isOnDemandOrder = isOnDemandProductType || (isOutOfStock && allowOrderExceedingStock);
  const manufacturingDays = pAny.manufacturingDays || pAny.identity?.manufacturing_days || 5;

  const [showReportModal, setShowReportModal] = useState(false);
  const personalizationMode = pAny.personalization_mode || pAny.personalizationMode || pAny.identity?.personalization_mode || (pAny.accept_customization === false ? 'disabled' : 'accept_direct');
  const isPersonalizationDisabled = personalizationMode === 'disabled';

  // Sync bookmark state with parent prop
  useEffect(() => {
    setIsFav(isFavorite || false);
  }, [isFavorite]);

  // Load reviews from database on load
  useEffect(() => {
    const loadReviews = async () => {
      const dbReviews = await reviewsService.fetchReviews(product.id);
      setReviews(dbReviews);
      setLoadingReviews(false);
    };
    loadReviews();
  }, [product.id]);

  const handleBookmarkToggle = () => {
    const nextState = !isFav;
    setIsFav(nextState);
    if (onToggleFavorite) {
      onToggleFavorite(product);
    } else {
      if (nextState) {
        recSession.trackAction('BOOKMARK', tags);
      }
    }
  };

  const handleOrder = async () => {
    setIsOrdering(true);
    try {
      recSession.trackAction('ORDER', tags);
      console.log(`[DETAIL] 🛒 ORDER action queued on tags [${tags.join(', ')}]`);

      const pAny = product as any;
      const clientRef = currentUser?.id || "client-me";
      const artisanRef = product.artisanRef || pAny.artisanId || pAny.artisan_ref || pAny.facets?.artisan_ref || "artisan_abdelkader";
      const artisanName = product.artisanName || pAny.artisan_name || "Maâlem Abdelkader";
      const productImage = product.image || pAny.image_url || getFallbackImage(product.category);

      const orderProductType = (isOnDemandOrder || pAny.productType === "sur_commande" || pAny.identity?.product_type === "sur_commande")
        ? "sur_commande"
        : "standard";

      const newOrder = await clientWalletAPI.createOrder(
        clientRef,
        artisanRef,
        priceVal,
        orderProductType,
        product.title,
        photos[0] || productImage,
        artisanName,
        product.id,
        1,
        {
          selectedSize: selectedSize || undefined,
          selectedColor: selectedColor || undefined,
          tags,
          productPhotos: photos,
        }
      );

      console.log(`[DETAIL] Order initialized for ${product.title} (ID: ${newOrder.id})`);
      setActiveOrderId(newOrder.id);
      onNavigate('client-order-detail');
      onClose();
    } catch (err: any) {
      console.error("[DETAIL] Error ordering:", err);
      if (err?.message) {
        alert(err.message);
      }
    } finally {
      setIsOrdering(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert("Veuillez vous connecter pour laisser un avis.");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await reviewsService.submitReview({
        userId: currentUser.id,
        productId: product.id,
        rating: userRating,
        comment: userComment
      });

      if (res.success && res.review) {
        // Optimistically add to list with current user's name
        const newReview: Review = {
          ...res.review,
          author: currentUser.name || currentUser.email || 'Moi',
          avatarUrl: currentUser.avatarUrl || null
        };
        setReviews(prev => [newReview, ...prev]);
        setUserComment('');
        setShowReviewForm(false);
      }
    } catch (err) {
      console.error("Error submitting review:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <motion.div
      className="search-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ zIndex: 300 }}
    >
      {/* Background Blur */}
      <div className="search-bg-blur" style={{ background: 'rgba(26, 42, 58, 0.45)' }} onClick={onClose} />
      
      {/* Main Slide-Up Panel */}
      <motion.div
        className="search-panel"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          borderRadius: 32,
          overflow: 'hidden',
          background: '#FCFBF9',
          display: 'flex',
          flexDirection: 'column',
          height: '92vh',
          marginTop: 'auto'
        }}
      >
        {/* Header Bar */}
        <div className="search-header" style={{ justifyContent: 'space-between', padding: '16px 20px' }}>
          <button className="search-back-btn" onClick={onClose} aria-label="Fermer">
            <X size={18} strokeWidth={2} />
          </button>
          
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', margin: 0 }}>
            Détails de la création
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => setShowReportModal(true)}
              title="Signaler ce produit"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Flag size={18} />
            </button>
            <button
              onClick={handleBookmarkToggle}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isFav ? '#DC3545' : 'var(--text-secondary)',
                transition: 'transform 0.15s ease',
                padding: 6,
              }}
            >
              <Heart size={20} fill={isFav ? '#DC3545' : 'none'} />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 170px 20px' }}>
          
          {/* Main Product Image & Multi-photo Gallery */}
          <div style={{ margin: '20px 0 10px 0', borderRadius: 24, overflow: 'hidden', height: 280, position: 'relative', boxShadow: 'var(--shadow-md)' }}>
            <img
              src={photos[activePhotoIdx] || product.image || getFallbackImage(product.category)}
              alt={product.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {/* Sceau / Badge de stock de luxe Vork */}
            <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <LuxuryStockBadge
                stock={currentStock}
                initialStock={initialStock}
                isOutOfStock={isOutOfStock}
                stockPolicy={stockPolicy}
                variant="card"
              />
              {isOnDemandOrder && currentStock === undefined && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 20,
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(212, 175, 55, 0.5)',
                  color: '#8B6914',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  ✦ Sur Commande · Hors stock ({manufacturingDays}j)
                </span>
              )}
            </div>
            {product.badge && !isOutOfStock && (
              <span
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: 'var(--accent-warm)',
                  fontWeight: 700,
                  fontSize: '0.72rem',
                  padding: '4px 10px',
                  borderRadius: 20,
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                ✦ {product.badge}
              </span>
            )}
          </div>

          {photos.length > 1 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
              {photos.map((src, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActivePhotoIdx(idx)}
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 12,
                    overflow: 'hidden',
                    padding: 0,
                    flexShrink: 0,
                    border: activePhotoIdx === idx ? '2.5px solid var(--accent-warm)' : '1px solid var(--border)',
                    cursor: 'pointer',
                    background: '#FFF',
                  }}
                >
                  <img src={src} alt={`photo-${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}

          {/* Product Meta */}
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1.25, marginBottom: 8, textAlign: 'left' }}>
              {product.title}
            </h1>

            {/* Badge Stock étendu si applicable */}
            {(currentStock !== undefined || isOutOfStock) && (
              <div style={{ marginBottom: 12 }}>
                <LuxuryStockBadge
                  stock={currentStock}
                  initialStock={initialStock}
                  isOutOfStock={isOutOfStock}
                  stockPolicy={stockPolicy}
                  variant="detail"
                />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(233, 230, 225, 0.6)', padding: '3px 8px', borderRadius: 8 }}>
                  {product.category ? product.category.toUpperCase() : 'ARTISANAT'}
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: 8,
                  background: isOnDemandOrder ? 'rgba(212, 175, 55, 0.14)' : 'rgba(45, 106, 79, 0.1)',
                  color: isOnDemandOrder ? '#8B6914' : '#2D6A4F',
                }}>
                  {isOnDemandOrder ? `Sur Commande · Hors stock (${manufacturingDays}j)` : 'Standard · En stock'}
                </span>
              </div>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-warm)' }}>
                {priceVal.toLocaleString('fr-FR')} <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>MAD</span>
              </span>
            </div>

            {/* Tags du post */}
            {tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
                {tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '3px 9px',
                      borderRadius: 99,
                      background: 'rgba(26, 42, 58, 0.06)',
                      color: 'var(--primary)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Sélecteurs Tailles & Couleurs */}
            {(sizes.length > 0 || colors.length > 0) && (
              <div style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 18, padding: 14, marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sizes.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0', textAlign: 'left' }}>
                      Taille / Format souhaité :
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sizes.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSelectedSize(s)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: selectedSize === s ? '1.5px solid var(--accent-warm)' : '1px solid var(--border)',
                            background: selectedSize === s ? 'var(--accent-warm)' : '#FAF8F5',
                            color: selectedSize === s ? '#FFFFFF' : 'var(--primary)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {colors.length > 0 && (
                  <div>
                    <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', margin: '0 0 6px 0', textAlign: 'left' }}>
                      Couleur souhaitée :
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {colors.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedColor(c)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: 10,
                            border: selectedColor === c ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                            background: selectedColor === c ? 'var(--primary)' : '#FAF8F5',
                            color: selectedColor === c ? '#FFFFFF' : 'var(--primary)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Guarantee Box */}
          <div style={{ background: 'rgba(156, 175, 136, 0.08)', border: '1px solid rgba(156, 175, 136, 0.25)', borderRadius: 20, padding: 16, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
            <Shield size={24} color="var(--accent-secondary)" style={{ flexShrink: 0 }} />
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>Garantie Escrow Vork 15j</p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>Fonds sécurisés et déblocage progressif à l'artisan marocain.</p>
            </div>
          </div>

          {/* Artisan Card */}
          <div style={{ marginBottom: 28 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 12, textAlign: 'left' }}>
              Créateur Maâlem
            </h3>
            <div style={{ display: 'flex', gap: 16, background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 24, padding: 16, alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <img
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=150&auto=format&fit=crop"
                alt={product.artisanName || "Maâlem"}
                style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent-premium)' }}
              />
              <div style={{ textAlign: 'left' }}>
                <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                  {product.artisanName || (product as any).artisan_name || "Maâlem Abdelkader"}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                  Maître artisan • Fès, Maroc
                </p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                Avis de la communauté
              </h3>
              <button
                onClick={() => setShowReviewForm(prev => !prev)}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: 'var(--accent-warm)',
                  cursor: 'pointer'
                }}
              >
                <Edit3 size={12} />
                Laisser un avis
              </button>
            </div>

            {/* Write Review Form */}
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} style={{ background: '#FFFFFF', border: '1px dashed var(--accent-warm)', borderRadius: 20, padding: 16, marginBottom: 20, textAlign: 'left' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', marginBottom: 10 }}>Votre évaluation</h4>
                
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setUserRating(star)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Star size={18} fill={star <= userRating ? "#D4AF37" : "none"} color="#D4AF37" />
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Écrivez votre commentaire ici..."
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    height: 80,
                    borderRadius: 12,
                    border: '1px solid var(--border)',
                    padding: 10,
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.78rem',
                    marginBottom: 12,
                    resize: 'none'
                  }}
                />

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowReviewForm(false)}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    style={{ padding: '6px 12px', borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {submittingReview ? 'Envoi...' : 'Publier'}
                  </button>
                </div>
              </form>
            )}

            {loadingReviews ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Chargement des avis...</div>
            ) : reviews.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {reviews.map(r => (
                  <div key={r.id} style={{ background: '#FFFFFF', border: '1px solid var(--border)', borderRadius: 20, padding: 14, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{r.author}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                        {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={11} fill={i < r.rating ? "#D4AF37" : "none"} color="#D4AF37" />
                      ))}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4, margin: 0 }}>
                      {r.comment}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ background: '#FFFFFF', border: '1px dashed var(--border)', borderRadius: 20, padding: 24, textAlign: 'center' }}>
                <MessageSquare size={24} color="var(--text-secondary)" style={{ marginBottom: 8 }} />
                <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--primary)', margin: '0 0 2px 0' }}>Aucun avis pour le moment</p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: 0 }}>Soyez le premier à partager votre expérience !</p>
              </div>
            )}
          </div>

        </div>

        {/* Sticky Action Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(252, 251, 249, 0.95)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid var(--border)',
            padding: '14px 20px',
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
            zIndex: 10
          }}
        >
          {/* Bouton Personnaliser (Tri-mode: masqué si disabled, direct ou marché public) */}
          {!isPersonalizationDisabled && (
            <button
              onClick={() => {
                sessionStorage.setItem('vork_atelier_template_product', JSON.stringify({
                  ...product,
                  personalizationMode,
                  selectedSize: selectedSize || undefined,
                  selectedColor: selectedColor || undefined,
                  tags,
                  photos,
                }));
                onNavigate('atelier');
                onClose();
              }}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 18,
                background: personalizationMode === 'delegate_to_market'
                  ? 'linear-gradient(135deg, #FFFDF8, #F3ECE2)'
                  : 'linear-gradient(135deg, rgba(212, 175, 55, 0.12), rgba(184, 98, 63, 0.12))',
                color: 'var(--primary)',
                border: '1.5px solid rgba(212, 175, 55, 0.4)',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: 10,
                boxShadow: '0 2px 8px rgba(212, 175, 55, 0.08)',
              }}
            >
              <Sparkles size={16} color="var(--accent-warm)" />
              {personalizationMode === 'delegate_to_market'
                ? '✦ Personnaliser via le Marché Public des Artisans'
                : '✦ Personnaliser avec ce Maâlem'}
            </button>
          )}

          <button
            onClick={handleOrder}
            disabled={isOrdering || isStrictOutOfStock}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: 18,
              background: isStrictOutOfStock 
                ? 'rgba(26, 42, 58, 0.2)' 
                : isOnDemandOrder 
                  ? 'linear-gradient(135deg, #B8623F, #D4AF37)' 
                  : 'linear-gradient(135deg, var(--primary), #2D4356)',
              color: '#FFFFFF',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: isOrdering ? 'wait' : isStrictOutOfStock ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: isStrictOutOfStock ? 'none' : '0 8px 24px rgba(26, 42, 58, 0.16)'
            }}
          >
            {isOrdering 
              ? 'Traitement...' 
              : isStrictOutOfStock 
                ? 'Édition épuisée · Victime de son succès' 
                : isOnDemandOrder 
                  ? 'Commander la confection (sur commande)' 
                  : 'Acheter maintenant'}
            {!isOrdering && !isStrictOutOfStock && <ArrowRight size={16} />}
          </button>
        </div>

        {/* Modal de signalement */}
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="product"
          targetId={product.id}
          targetTitle={product.title}
          targetOwnerId={product.artisanRef || (product as any).artisan_ref}
          reporterId={currentUser?.id || 'client-me'}
          reporterType="client"
        />
      </motion.div>
    </motion.div>
  );
};
