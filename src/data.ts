import { Category, Product } from './types';

export const categories: Category[] = [
  {
    id: 'tech',
    name: 'Future Tech',
    description: 'Cutting-edge gadgets and hardware.',
    layout: 'grid',
    displayMode: 'card',
    background: 'bg-slate-950',
    accentColor: '#3b82f6',
  },
  {
    id: 'lifestyle',
    name: 'Lifestyle',
    description: 'Elevate your daily routine.',
    layout: 'grid',
    displayMode: 'tile',
    background: 'bg-stone-50',
    accentColor: '#78716c',
  },
  {
    id: 'fashion',
    name: 'High Fashion',
    description: 'Avant-garde apparel and accessories.',
    layout: 'grid',
    displayMode: 'card',
    background: 'bg-rose-50',
    accentColor: '#e11d48',
  },
  {
    id: 'home',
    name: 'Modern Home',
    description: 'Minimalist furniture and decor.',
    layout: 'grid',
    displayMode: 'tile',
    background: 'bg-emerald-950',
    accentColor: '#10b981',
  },
];

const generateProducts = (category: string, count: number): Product[] => {
  const baseNames: Record<string, string[]> = {
    tech: ['Neural Link', 'Quantum Drive', 'Holo Lens', 'Nano Bot', 'Cyber Core', 'Plasma Cell', 'Void Disk', 'Aero Drone', 'Bio Chip', 'Sync Node'],
    lifestyle: ['Zen Mist', 'Pure Flow', 'Eco Pulse', 'Urban Kit', 'Daily Brew', 'Silk Wrap', 'Root Bowl', 'Soft Beam', 'Wild Leaf', 'Aura Case'],
    fashion: ['Neo Coat', 'Vogue Boot', 'Glow Mesh', 'Silk Veil', 'Onyx Ring', 'Prism Bag', 'Lunar Suit', 'Velvet Cap', 'Aura Belt', 'Titan Watch'],
    home: ['Nordic Bed', 'Zen Chair', 'Lava Lamp', 'Oak Desk', 'Cloud Sofa', 'Rain Vase', 'Mist Fan', 'Glow Shelf', 'Soft Rug', 'Pure Mat']
  };

  const images: Record<string, string[]> = {
    tech: [
      'https://picsum.photos/seed/tech1/800/600',
      'https://picsum.photos/seed/tech2/800/600',
      'https://picsum.photos/seed/tech3/800/600',
      'https://picsum.photos/seed/tech4/800/600',
      'https://picsum.photos/seed/tech5/800/600'
    ],
    lifestyle: [
      'https://picsum.photos/seed/life1/800/600',
      'https://picsum.photos/seed/life2/800/600',
      'https://picsum.photos/seed/life3/800/600',
      'https://picsum.photos/seed/life4/800/600',
      'https://picsum.photos/seed/life5/800/600'
    ],
    fashion: [
      'https://picsum.photos/seed/fashion1/800/600',
      'https://picsum.photos/seed/fashion2/800/600',
      'https://picsum.photos/seed/fashion3/800/600',
      'https://picsum.photos/seed/fashion4/800/600',
      'https://picsum.photos/seed/fashion5/800/600'
    ],
    home: [
      'https://picsum.photos/seed/home1/800/600',
      'https://picsum.photos/seed/home2/800/600',
      'https://picsum.photos/seed/home3/800/600',
      'https://picsum.photos/seed/home4/800/600',
      'https://picsum.photos/seed/home5/800/600'
    ]
  };

  return Array.from({ length: count }, (_, i) => {
    const names = baseNames[category] || ['Product'];
    const name = names[i % names.length] + ' ' + (Math.floor(i / names.length) + 1);
    const categoryImages = images[category] || ['https://picsum.photos/seed/default/800/600'];
    
    return {
      id: `${category}-${i}`,
      name,
      description: `Premium ${category} product designed for excellence and performance.`,
      price: `$${(Math.random() * 1000 + 50).toFixed(2)}`,
      image: categoryImages[i % categoryImages.length],
      category,
      url: 'https://www.google.com',
      logo: i % 2 === 0 ? `https://picsum.photos/seed/logo${i}/100/100` : undefined,
      details: ['High performance', 'Durable material', 'Modern design', 'Eco-friendly']
    };
  });
};

export const products: Product[] = [
  ...generateProducts('tech', 40),
  ...generateProducts('lifestyle', 40),
  ...generateProducts('fashion', 40),
  ...generateProducts('home', 40)
];
