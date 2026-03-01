
import React from 'react';

export type View = 'onboarding' | 'home' | 'search' | 'chats' | 'chat-detail' | 'bookings' | 'orders' | 'order-detail' | 'create-order' | 'profile' | 'urgent' | 'generic-form' | 'artisan-detail' | 'category-detail' | 'all-categories' | 'portfolio' | 'work-detail' | 'reviews' | 'favorites-list' | 'settings' | 'verify-email' | 'update-email' | 'marketplace' | 'notifications' | 'artisan-history';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Review {
  id: string;
  artisanId?: string; // Added for collection querying
  orderId?: string;
  userId?: string;
  userName: string;
  userAvatar: string;
  rating: number;
  date: string; // ISO string or display string
  comment: string;
  images?: string[]; // URLs of photos attached to the review
  createdAt?: string; // ISO string
}

export interface PortfolioItem {
  id: string;
  title: string;
  image: string;
  description?: string;
  customerReview?: Review;
  category?: string;
  date?: string;
  likes?: number;
  views?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
  description: string;
  image: string;
  interventions: string[];
}

export interface Artisan {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviewsCount: number;
  distance: string;
  location: string;
  city?: string;
  locationCoords?: Coordinates;
  image: string;
  available: boolean;
  price?: string;
  experience: number;
  jobsDone: number;
  about: string;
  services: string[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  phone?: string;
  email?: string;
  createdAt?: string;

  // Recommendation System Fields
  averageResponseTime?: number; // minutes
  currentActiveJobs?: number;
  maxConcurrentJobs?: number;

  // Statistics
  stats?: {
    last30DaysResponseTime: number;
    acceptanceRate: number;
  };

  // Legacy/Compatibility fields
  avatar?: string;
  reviewCount?: number;
  priceRange?: string;
  verified?: boolean;
  responseTime?: string;
  availability?: boolean;
  specialties?: string[];
  yearsExperience?: number;
  badges?: string[];
  isExplicitlyOnline?: boolean;
}

export interface Quote {
  id: string;
  orderId: string;
  artisanId: string;
  artisanName: string;
  artisanImage: string;
  artisanRating: number;
  amount: number;
  price: string;
  description: string;
  createdAt: string;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'artisan';
  timestamp: string;
  status?: 'sent' | 'read';
}

export interface Chat {
  id: string;
  artisanId: string;
  artisanName: string;
  artisanImage: string;
  userId: string;
  userName?: string;
  userImage?: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isOnline: boolean;
  messages?: Message[];
}

export interface Order {
  id: string;
  userId?: string;
  artisanId?: string;
  artisanName?: string;
  artisanImage?: string;
  artisanRating?: number;
  assignedPrice?: string;
  category: string;
  status: string; // Unified status
  date: string;
  description: string;
  location: string;
  city?: string;
  locationCoords?: Coordinates;

  // Matching Engine Fields
  currentRadius?: number;
  contactedArtisanIds?: string[];
  rejectedArtisanIds?: string[];
  targetedArtisans?: string[];

  isUrgent?: boolean;
  priority?: string;
  images?: string[]; // Initial problem images
  resultImages?: string[]; // Final result images from review
  createdAt?: string;
  updatedAt?: string;
  isDirect?: boolean;
  searchRadius?: number;
  responses?: any;

  // Archive & Review Fields
  completedAt?: any;
  archivedAt?: any;
  finishRequestedBy?: 'client' | 'artisan';
  reviewId?: string; // Reference to the review in reviews collection
  finalReview?: {
    rating: number;
    comment: string;
    images?: string[];
  };

  // Legacy/Compatibility fields
  title?: string;
  artisanAvatar?: string;
  userName?: string;
  userAvatar?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'order_accepted' | 'message' | 'system';
  read: boolean;
  createdAt: string;
  relatedId?: string; // e.g., orderId or chatId
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  image?: string;
  phone?: string;
  role?: 'user' | 'artisan';
  location?: Coordinates;
  createdAt?: string;
  favorites?: string[];
}
