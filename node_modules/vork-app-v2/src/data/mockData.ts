
import { Category, Artisan, Chat } from '../types';

export const CATEGORIES: Category[] = [
  {
    id: '1',
    name: 'Climatisation',
    icon: 'Wind',
    color: 'bg-teal-500/20 text-teal-400',
    count: 12,
    description: "Installation et entretien de systèmes de climatisation.",
    image: "",
    interventions: []
  },
  {
    id: '2',
    name: 'Plomberie',
    icon: 'Droplet',
    color: 'bg-blue-500/20 text-blue-400',
    count: 24,
    description: "Experts certifiés pour tous vos besoins de plomberie.",
    image: "",
    interventions: []
  },
  {
    id: '3',
    name: 'Électricité',
    icon: 'Lightbulb',
    color: 'bg-yellow-500/20 text-yellow-400',
    count: 18,
    description: "Solutions électriques sûres et modernes.",
    image: "",
    interventions: []
  },
  {
    id: '4',
    name: 'Peinture',
    icon: 'Paintbrush',
    color: 'bg-pink-500/20 text-pink-400',
    count: 15,
    description: "Embellissez votre intérieur avec nos peintres experts.",
    image: "",
    interventions: []
  },
  {
    id: '5',
    name: 'Menuiserie',
    icon: 'Wrench',
    color: 'bg-purple-500/20 text-purple-400',
    count: 9,
    description: "Conception et réparation de meubles.",
    image: "",
    interventions: []
  },
  {
    id: '6',
    name: 'Sécurité',
    icon: 'Shield',
    color: 'bg-emerald-500/20 text-emerald-400',
    count: 7,
    description: "Systèmes d'alarme et surveillance.",
    image: "",
    interventions: []
  },
  {
    id: '7',
    name: 'Maçonnerie',
    icon: 'Hammer',
    color: 'bg-indigo-500/20 text-indigo-400',
    count: 11,
    description: "Gros œuvre et rénovations murales.",
    image: "",
    interventions: []
  },
  {
    id: '8',
    name: 'Nettoyage',
    icon: 'Sparkles',
    color: 'bg-cyan-500/20 text-cyan-400',
    count: 30,
    description: "Nettoyage professionnel résidentiel et commercial.",
    image: "",
    interventions: []
  },
  {
    id: '9',
    name: 'Décoration',
    icon: 'Home',
    color: 'bg-fuchsia-500/20 text-fuchsia-400',
    count: 8,
    description: "Aménagement d'intérieur et design.",
    image: "",
    interventions: []
  },
  {
    id: '10',
    name: 'Mécanique',
    icon: 'Car',
    color: 'bg-orange-500/20 text-orange-400',
    count: 14,
    description: "Entretien et réparation automobile.",
    image: "",
    interventions: []
  },
  {
    id: '11',
    name: 'Jardinage',
    icon: 'Leaf',
    color: 'bg-green-500/20 text-green-400',
    count: 10,
    description: "Entretien d'espaces verts et paysagisme.",
    image: "",
    interventions: []
  },
  {
    id: '12',
    name: 'Photographie',
    icon: 'Camera',
    color: 'bg-violet-500/20 text-violet-400',
    count: 6,
    description: "Capturez vos moments importants.",
    image: "",
    interventions: []
  },
];

export const ARTISANS: Artisan[] = [
  {
    id: 'a1',
    name: 'Youssef Benali',
    category: 'Plomberie',
    rating: 4.9,
    reviewsCount: 124,
    distance: '0.8 km',
    location: 'Guéliz',
    available: true,
    image: 'https://images.unsplash.com/photo-1544724123-107001479262?q=80&w=1974&auto=format&fit=crop',
    experience: 8,
    jobsDone: 124,
    about: "Maître Plombier spécialisé dans la rénovation résidentielle et commerciale.",
    services: ["Plomberie Expert", "Installation Sanitaire"],
    portfolio: [
      { id: 'p1', title: 'Villa Wiring', image: 'https://images.unsplash.com/photo-1621905231184-7a9a36ad2960?q=80&w=2070&auto=format&fit=crop' }
    ],
    reviews: [
      { id: 'r1', userName: 'Sarah K.', userAvatar: 'SK', rating: 5, date: '2 days ago', comment: "Service de plomberie impeccable." }
    ]
  },
  {
    id: 'a2',
    name: 'Moussa Diop',
    category: 'Climatisation',
    rating: 4.8,
    reviewsCount: 56,
    distance: '1.5 km',
    location: 'Ngor',
    available: true,
    image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1974&auto=format&fit=crop',
    experience: 10,
    jobsDone: 89,
    about: "Expert en systèmes multi-split et climatisation centrale pour bureaux.",
    services: ["Entretien Clim", "Installation VRV"],
    portfolio: [
      { id: 'p2', title: 'Bureaux Almadies', image: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ec4?auto=format&fit=crop&q=80' }
    ],
    reviews: [
      { id: 'r2', userName: 'Jean P.', userAvatar: 'JP', rating: 5, date: '1 semaine', comment: "Installation propre et efficace." }
    ]
  },
];

export const CHATS: Chat[] = [
  {
    id: 'c1',
    artisanId: 'a1',
    artisanName: 'Youssef Benali',
    artisanImage: 'https://images.unsplash.com/photo-1544724123-107001479262?q=80&w=1974&auto=format&fit=crop',
    userId: 'user-123',
    lastMessage: 'Je peux être là dans 20 minutes.',
    timestamp: '14:45',
    unreadCount: 1,
    isOnline: true,
    messages: [
      { id: 'm1', text: 'Bonjour, j\'ai une fuite dans ma cuisine.', sender: 'user', timestamp: '14:30', status: 'read' },
      { id: 'm2', text: 'Bonjour ! Je peux vous aider. C\'est grave ?', sender: 'artisan', timestamp: '14:35' },
      { id: 'm3', text: 'Oui, ça coule pas mal sous l\'évier.', sender: 'user', timestamp: '14:40', status: 'read' },
      { id: 'm4', text: 'Je peux être là dans 20 minutes.', sender: 'artisan', timestamp: '14:45' },
    ]
  }
];
