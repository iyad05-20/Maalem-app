
import { db } from '../services/firebase.config';
import { collection, addDoc, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Export EXAMPLE_PROFILES to resolve import error in index.tsx
export const EXAMPLE_PROFILES = [
  // Climatisation
  { name: 'Moussa Diop', category: 'Climatisation', rating: 4.8, reviewsCount: 56, distance: '1.2 km', location: 'Ngor', available: true, image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=1974&auto=format&fit=crop', experience: 10, jobsDone: 145, about: "Expert en systèmes multi-split et VRV.", services: ["Installation", "Entretien Annuel"], phone: "+221 77 123 00 01", email: "moussa@vork.sn" },
  { name: 'Abdou Sall', category: 'Climatisation', rating: 4.5, reviewsCount: 22, distance: '3.4 km', location: 'Ouakam', available: true, image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop', experience: 5, jobsDone: 42, about: "Spécialiste froid et climatisation domestique.", services: ["Réparation Fuite", "Recharge Gaz"], phone: "+221 77 123 00 02", email: "abdou@vork.sn" },
  // Plomberie
  { name: 'Youssef Benali', category: 'Plomberie', rating: 4.9, reviewsCount: 124, distance: '0.8 km', location: 'Guéliz', available: true, image: 'https://images.unsplash.com/photo-1544724123-107001479262?q=80&w=1974&auto=format&fit=crop', experience: 8, jobsDone: 230, about: "Maître plombier certifié.", services: ["Tuyauterie", "Sanitaires"], phone: "+221 77 123 00 03", email: "youssef@vork.sn" },
  { name: 'Karim Tazi', category: 'Plomberie', rating: 4.7, reviewsCount: 89, distance: '2.1 km', location: 'Mermoz', available: true, image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop', experience: 12, jobsDone: 310, about: "Débouchage haute pression et installation chauffe-eau.", services: ["Débouchage", "Chauffe-eau"], phone: "+221 77 123 00 04", email: "karim@vork.sn" },
  // Électricité
  { name: 'Ahmed Amrani', category: 'Électricité', rating: 5.0, reviewsCount: 42, distance: '1.5 km', location: 'Plateau', available: true, image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=1974&auto=format&fit=crop', experience: 15, jobsDone: 412, about: "Domotique et mise en conformité électrique.", services: ["Tableau Électrique", "Domotique"], phone: "+221 77 123 00 05", email: "ahmed@vork.sn" },
  { name: 'Samba Kane', category: 'Électricité', rating: 4.6, reviewsCount: 31, distance: '4.2 km', location: 'Liberté 6', available: true, image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=1974&auto=format&fit=crop', experience: 6, jobsDone: 88, about: "Électricien bâtiment et éclairage LED.", services: ["Câblage", "Éclairage"], phone: "+221 77 123 00 06", email: "samba@vork.sn" },
  // Peinture
  { name: 'Fatou Ndiaye', category: 'Peinture', rating: 4.7, reviewsCount: 38, distance: '0.9 km', location: 'Ouakam', available: true, image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1974&auto=format&fit=crop', experience: 6, jobsDone: 112, about: "Spécialiste stuc et peintures décoratives.", services: ["Peinture Intérieure", "Stucco"], phone: "+221 77 123 00 07", email: "fatou@vork.sn" },
  { name: 'Ibrahim Fall', category: 'Peinture', rating: 4.4, reviewsCount: 15, distance: '5.1 km', location: 'Pikine', available: true, image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=1974&auto=format&fit=crop', experience: 4, jobsDone: 34, about: "Peinture extérieure et ravalement.", services: ["Façade", "Traitement Humidité"], phone: "+221 77 123 00 08", email: "ibrahim@vork.sn" },
  // Menuiserie
  { name: 'Modou Fall', category: 'Menuiserie', rating: 4.9, reviewsCount: 72, distance: '2.8 km', location: 'Hann', available: false, image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop', experience: 20, jobsDone: 560, about: "Ebéniste spécialisé en bois précieux.", services: ["Cuisine", "Meuble TV"], phone: "+221 77 123 00 09", email: "modou@vork.sn" },
  { name: 'Aliou Cissé', category: 'Menuiserie', rating: 4.3, reviewsCount: 29, distance: '6.0 km', location: 'Yoff', available: true, image: 'https://images.unsplash.com/photo-1534030347209-467a5b0ad3e6?q=80&w=1974&auto=format&fit=crop', experience: 9, jobsDone: 120, about: "Menuiserie aluminium et bois.", services: ["Portes", "Fenêtres"], phone: "+221 77 123 00 10", email: "aliou@vork.sn" },
  // Sécurité
  { name: 'Idrissa Seck', category: 'Sécurité', rating: 4.8, reviewsCount: 29, distance: '1.8 km', location: 'Fann', available: true, image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1976&auto=format&fit=crop', experience: 9, jobsDone: 95, about: "Installation alarmes et caméras connectées.", services: ["Caméras", "Alarme"], phone: "+221 77 123 00 11", email: "idrissa@vork.sn" },
  // Maçonnerie
  { name: 'Babacar Gueye', category: 'Maçonnerie', rating: 4.6, reviewsCount: 88, distance: '3.9 km', location: 'Parcelles', available: true, image: 'https://images.unsplash.com/photo-1516539137713-d8839b4e1509?q=80&w=1974&auto=format&fit=crop', experience: 12, jobsDone: 212, about: "Expert gros œuvre et dallage.", services: ["Murs", "Terrasse"], phone: "+221 77 123 00 12", email: "babacar@vork.sn" },
  // Nettoyage
  { name: 'Awa Sarr', category: 'Nettoyage', rating: 5.0, reviewsCount: 110, distance: '0.4 km', location: 'Mermoz', available: true, image: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2a04?q=80&w=1974&auto=format&fit=crop', experience: 4, jobsDone: 840, about: "Nettoyage pro fin de chantier et bureaux.", services: ["Bureaux", "Appartement"], phone: "+221 77 123 00 13", email: "awa@vork.sn" },
  { name: 'Fanta Sow', category: 'Nettoyage', rating: 4.9, reviewsCount: 64, distance: '1.2 km', location: 'Fann', available: true, image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1974&auto=format&fit=crop', experience: 3, jobsDone: 420, about: "Services de conciergerie et ménage express.", services: ["Ménage", "Repassage"], phone: "+221 77 123 00 14", email: "fanta@vork.sn" },
  // Décoration
  { name: 'Aminata Diallo', category: 'Décoration', rating: 4.9, reviewsCount: 45, distance: '2.5 km', location: 'Sicap', available: true, image: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?q=80&w=1974&auto=format&fit=crop', experience: 7, jobsDone: 45, about: "Design intérieur et aménagement.", services: ["Conseil Deco", "Plans 3D"], phone: "+221 77 123 00 15", email: "aminata@vork.sn" },
  // Mécanique
  { name: 'Omar Sy', category: 'Mécanique', rating: 4.7, reviewsCount: 63, distance: '3.1 km', location: 'Grand Dakar', available: true, image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop', experience: 11, jobsDone: 780, about: "Mécanicien automobile toute marque.", services: ["Vidange", "Freins"], phone: "+221 77 123 00 16", email: "omar@vork.sn" },
  // Jardinage
  { name: 'Bakary Coulibaly', category: 'Jardinage', rating: 4.8, reviewsCount: 34, distance: '4.5 km', location: 'Yoff', available: true, image: 'https://images.unsplash.com/photo-1474176857210-7287d38d27c6?q=80&w=1970&auto=format&fit=crop', experience: 14, jobsDone: 156, about: "Aménagement d'espaces verts.", services: ["Taille", "Gazon"], phone: "+221 77 123 00 17", email: "bakary@vork.sn" },
  // Photographie
  { name: 'Chloe Martin', category: 'Photographie', rating: 5.0, reviewsCount: 15, distance: '2.2 km', location: 'Plateau', available: true, image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?q=80&w=1972&auto=format&fit=crop', experience: 5, jobsDone: 120, about: "Photographe événementiel.", services: ["Mariage", "Portrait"], phone: "+221 77 123 00 18", email: "chloe@vork.sn" },
  // Multi-services
  { name: 'Ismael Ndir', category: 'Bricolage', rating: 4.5, reviewsCount: 92, distance: '1.0 km', location: 'Medina', available: true, image: 'https://images.unsplash.com/photo-1542178243-bc20204b7694?q=80&w=1974&auto=format&fit=crop', experience: 10, jobsDone: 640, about: "L'homme à tout faire pour vos petits travaux.", services: ["Montage", "Réparation"], phone: "+221 77 123 00 19", email: "ismael@vork.sn" },
  { name: 'Ousmane Mane', category: 'Climatisation', rating: 4.9, reviewsCount: 310, distance: '0.2 km', location: 'Point E', available: true, image: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?q=80&w=1960&auto=format&fit=crop', experience: 18, jobsDone: 1200, about: "Expert froid industriel et domestique.", services: ["Installation", "Expertise"], phone: "+221 77 123 00 20", email: "ousmane@vork.sn" }
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
