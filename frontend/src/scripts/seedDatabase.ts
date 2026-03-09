
import { db } from '../services/firebase.config';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, doc, setDoc, query, limit } from "firebase/firestore";

// Export EXAMPLE_PROFILES to resolve import error in index.tsx
export const EXAMPLE_PROFILES = [
  // Climatisation
  // Climatisation
  { name: 'Moussa Diop', category: 'Climatisation', rating: 4.8, reviewsCount: 56, distance: '1.2 km', location: 'Hivernage', available: true, image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1974&auto=format&fit=crop', experience: 10, jobsDone: 145, about: "Expert en systèmes multi-split et VRV.", services: ["Installation", "Entretien Annuel"], phone: "+212 661 23 45 67", email: "moussa@vork.ma" },
  { name: 'Abdou Sall', category: 'Climatisation', rating: 4.5, reviewsCount: 22, distance: '3.4 km', location: 'Daoudiate', available: true, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop', experience: 5, jobsDone: 42, about: "Spécialiste froid et climatisation domestique.", services: ["Réparation Fuite", "Recharge Gaz"], phone: "+212 661 23 45 68", email: "abdou@vork.ma" },
  // Plomberie
  { name: 'Youssef Benali', category: 'Plomberie', rating: 4.9, reviewsCount: 124, distance: '0.8 km', location: 'Guéliz', available: true, image: 'https://images.unsplash.com/photo-1544724123-107001479262?q=80&w=1974&auto=format&fit=crop', experience: 8, jobsDone: 230, about: "Maître plombier certifié.", services: ["Tuyauterie", "Sanitaires"], phone: "+212 661 23 45 69", email: "youssef@vork.ma" },
  { name: 'Karim Tazi', category: 'Plomberie', rating: 4.7, reviewsCount: 89, distance: '2.1 km', location: 'Semlalia', available: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop', experience: 12, jobsDone: 310, about: "Débouchage haute pression et installation chauffe-eau.", services: ["Débouchage", "Chauffe-eau"], phone: "+212 661 23 45 70", email: "karim@vork.ma" },
  // Électricité
  { name: 'Ahmed Amrani', category: 'Électricité', rating: 5.0, reviewsCount: 42, distance: '1.5 km', location: 'Médina', available: true, image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop', experience: 15, jobsDone: 412, about: "Domotique et mise en conformité électrique.", services: ["Tableau Électrique", "Domotique"], phone: "+212 661 23 45 71", email: "ahmed@vork.ma" },
  { name: 'Samba Kane', category: 'Électricité', rating: 4.6, reviewsCount: 31, distance: '4.2 km', location: 'Mabrouka', available: true, image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop', experience: 6, jobsDone: 88, about: "Électricien bâtiment et éclairage LED.", services: ["Câblage", "Éclairage"], phone: "+212 661 23 45 72", email: "samba@vork.ma" },
  // Peinture
  { name: 'Fatou Ndiaye', category: 'Peinture', rating: 4.7, reviewsCount: 38, distance: '0.9 km', location: 'Daoudiate', available: true, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop', experience: 6, jobsDone: 112, about: "Spécialiste stuc et peintures décoratives.", services: ["Peinture Intérieure", "Stucco"], phone: "+212 661 23 45 73", email: "fatou@vork.ma" },
  { name: 'Ibrahim Fall', category: 'Peinture', rating: 4.4, reviewsCount: 15, distance: '5.1 km', location: 'Sidi Youssef', available: true, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop', experience: 4, jobsDone: 34, about: "Peinture extérieure et ravalement.", services: ["Façade", "Traitement Humidité"], phone: "+212 661 23 45 74", email: "ibrahim@vork.ma" },
  // Menuiserie
  { name: 'Modou Fall', category: 'Menuiserie', rating: 4.9, reviewsCount: 72, distance: '2.8 km', location: 'Targa', available: false, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop', experience: 20, jobsDone: 560, about: "Ebéniste spécialisé en bois précieux.", services: ["Cuisine", "Meuble TV"], phone: "+212 661 23 45 75", email: "modou@vork.ma" },
  { name: 'Aliou Cissé', category: 'Menuiserie', rating: 4.3, reviewsCount: 29, distance: '6.0 km', location: 'Amerchich', available: true, image: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?q=80&w=1974&auto=format&fit=crop', experience: 9, jobsDone: 120, about: "Menuiserie aluminium et bois.", services: ["Portes", "Fenêtres"], phone: "+212 661 23 45 76", email: "aliou@vork.ma" },
  // Sécurité
  { name: 'Idrissa Seck', category: 'Sécurité', rating: 4.8, reviewsCount: 29, distance: '1.8 km', location: 'Victor Hugo', available: true, image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop', experience: 9, jobsDone: 95, about: "Installation alarmes et caméras connectées.", services: ["Caméras", "Alarme"], phone: "+212 661 23 45 77", email: "idrissa@vork.ma" },
  // Maçonnerie
  { name: 'Babacar Gueye', category: 'Maçonnerie', rating: 4.6, reviewsCount: 88, distance: '3.9 km', location: 'Annakhil', available: true, image: 'https://images.unsplash.com/photo-1516539137713-d8839b4e1509?q=80&w=1974&auto=format&fit=crop', experience: 12, jobsDone: 212, about: "Expert gros œuvre et dallage.", services: ["Murs", "Terrasse"], phone: "+212 661 23 45 78", email: "babacar@vork.ma" },
  // Nettoyage
  { name: 'Awa Sarr', category: 'Nettoyage', rating: 5.0, reviewsCount: 110, distance: '0.4 km', location: 'Semlalia', available: true, image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2a04?q=80&w=1974&auto=format&fit=crop', experience: 4, jobsDone: 840, about: "Nettoyage pro fin de chantier et bureaux.", services: ["Bureaux", "Appartement"], phone: "+212 661 23 45 79", email: "awa@vork.ma" },
  { name: 'Fanta Sow', category: 'Nettoyage', rating: 4.9, reviewsCount: 64, distance: '1.2 km', location: 'Victor Hugo', available: true, image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1974&auto=format&fit=crop', experience: 3, jobsDone: 420, about: "Services de conciergerie et ménage express.", services: ["Ménage", "Repassage"], phone: "+212 661 23 45 80", email: "fanta@vork.ma" },
  // Décoration
  { name: 'Aminata Diallo', category: 'Décoration', rating: 4.9, reviewsCount: 45, distance: '2.5 km', location: 'Massira', available: true, image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1974&auto=format&fit=crop', experience: 7, jobsDone: 45, about: "Design intérieur et aménagement.", services: ["Conseil Deco", "Plans 3D"], phone: "+212 661 23 45 81", email: "aminata@vork.ma" },
  // Mécanique
  { name: 'Omar Sy', category: 'Mécanique', rating: 4.7, reviewsCount: 63, distance: '3.1 km', location: 'Mhamid', available: true, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop', experience: 11, jobsDone: 780, about: "Mécanicien automobile toute marque.", services: ["Vidange", "Freins"], phone: "+212 661 23 45 82", email: "omar@vork.ma" },
  // Jardinage
  { name: 'Bakary Coulibaly', category: 'Jardinage', rating: 4.8, reviewsCount: 34, distance: '4.5 km', location: 'Amerchich', available: true, image: 'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1970&auto=format&fit=crop', experience: 14, jobsDone: 156, about: "Aménagement d'espaces verts.", services: ["Taille", "Gazon"], phone: "+212 661 23 45 83", email: "bakary@vork.ma" },
  // Photographie
  { name: 'Chloe Martin', category: 'Photographie', rating: 5.0, reviewsCount: 15, distance: '2.2 km', location: 'Médina', available: true, image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=1972&auto=format&fit=crop', experience: 5, jobsDone: 120, about: "Photographe événementiel.", services: ["Mariage", "Portrait"], phone: "+212 661 23 45 84", email: "chloe@vork.ma" },
  // Multi-services
  { name: 'Ismael Ndir', category: 'Bricolage', rating: 4.5, reviewsCount: 92, distance: '1.0 km', location: 'Massira', available: true, image: 'https://images.unsplash.com/photo-1542178243-bc20204b7694?q=80&w=1974&auto=format&fit=crop', experience: 10, jobsDone: 640, about: "L'homme à tout faire pour vos petits travaux.", services: ["Montage", "Réparation"], phone: "+212 661 23 45 85", email: "ismael@vork.ma" },
  { name: 'Ousmane Mane', category: 'Climatisation', rating: 4.9, reviewsCount: 310, distance: '0.2 km', location: 'Majorelle', available: true, image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1960&auto=format&fit=crop', experience: 18, jobsDone: 1200, about: "Expert froid industriel et domestique.", services: ["Installation", "Expertise"], phone: "+212 661 23 45 86", email: "ousmane@vork.ma" }
];

export const seedArtisans = async () => {
  const artisansRef = collection(db, "artisans");
  const existing = await getDocs(query(artisansRef, limit(1)));

  if (!existing.empty) {
    console.log("Database already has artisans. Skipping seed.");
    return;
  }

  console.log("Seeding 20 artisans to Firestore...");
  const promises = EXAMPLE_PROFILES.map(art => {
    return addDoc(artisansRef, {
      ...art,
      createdAt: new Date().toISOString(),
      portfolio: [],
      reviews: [
        { id: 'r1', userName: 'Client Vork', userAvatar: 'CV', rating: 5, date: 'Récemment', comment: "Excellent service, très professionnel." }
      ]
    });
  });

  await Promise.all(promises);
  console.log("Seeding complete!");
};

export const getSeedJson = () => JSON.stringify(EXAMPLE_PROFILES, null, 2);
