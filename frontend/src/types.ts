// Core Types for VORK Application

export type View =
    | 'home'
    | 'search'
    | 'artisan-detail'
    | 'portfolio'
    | 'work-detail'
    | 'reviews'
    | 'urgent'
    | 'bookings'
    | 'order-detail'
    | 'create-order'
    | 'chats'
    | 'chat-detail'
    | 'profile'
    | 'favorites-list'
    | 'settings'
    | 'marketplace'
    | 'all-categories'
    | 'category-detail'
    | 'update-email'
    | 'artisan-history';

export interface Coordinates {
    lat: number;
    lng: number;
}

export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    description?: string;
    count?: number;
}

export interface PortfolioItem {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string;
    date: string;
    likes?: number;
    views?: number;
}

export interface Review {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    comment: string;
    date: string;
    images?: string[];
    helpful?: number;
}

export interface Artisan {
    id: string;
    name: string;
    category: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    distance?: number;
    price?: string;
    priceRange?: string;
    verified?: boolean;
    responseTime?: string;
    availability?: boolean;
    description?: string;
    specialties?: string[];
    portfolio?: PortfolioItem[];
    reviews?: Review[];
    location?: Coordinates;
    phone?: string;
    email?: string;
    completedJobs?: number;
    yearsExperience?: number;
    badges?: string[];
}

export interface Quote {
    id: string;
    artisanId: string;
    orderId: string;
    amount: number;
    description: string;
    estimatedDuration?: string;
    breakdown?: {
        label: string;
        amount: number;
    }[];
    validUntil?: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: string;
}

export interface Order {
    id: string;
    userId?: string;
    artisanId?: string;
    artisanName?: string;
    artisanAvatar?: string;
    category: string;
    title?: string;
    description: string;
    status: string;
    date: string;
    location: string;
    city?: string;
    address?: string;
    coordinates?: Coordinates;
    images?: string[];
    price?: string;
    priority?: 'Basse' | 'Moyenne' | 'Haute' | 'Critique';
    isUrgent?: boolean;
    quotes?: Quote[];
    selectedQuoteId?: string;
    completionDate?: string;
    rating?: number;
    review?: string;
    responses?: any;
    targetedArtisans?: string[];
    contactedArtisanIds?: string[];
    currentRadius?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface Message {
    id: string;
    chatId: string;
    senderId: string;
    content: string;
    timestamp: string;
    read?: boolean;
    type?: 'text' | 'image' | 'file';
    fileUrl?: string;
}

export interface Chat {
    id: string;
    artisanId: string;
    artisanName: string;
    artisanAvatar?: string;
    artisanCategory?: string;
    lastMessage: string;
    lastMessageTime: string;
    unreadCount?: number;
    messages?: Message[];
    isActive?: boolean;
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    phone?: string;
    role?: 'user' | 'artisan';
    location?: Coordinates;
    createdAt?: string;
}
