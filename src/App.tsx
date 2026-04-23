/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useSpring } from 'motion/react';
import { 
  LayoutGrid, 
  ChevronRight, 
  ArrowLeft, 
  ShoppingCart, 
  Info, 
  Maximize2,
  Cpu,
  Zap,
  Heart,
  Share2,
  Menu,
  ArrowUp,
  Globe,
  MessageSquare,
  ShieldCheck,
  ExternalLink,
  Sun,
  Moon,
  CheckCircle2
} from 'lucide-react';
import { categories as initialCategories } from './data';
import { Product, Category, LayoutType, DisplayMode } from './types';
import Admin from './components/Admin';
import { db } from './lib/firebase';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [siteSettings, setSiteSettings] = useState({ 
    siteTitle: 'OmniGallery - Product Explorer', 
    siteKeywords: 'AI, Compute, Token', 
    siteDescription: 'A high-end product explorer.' 
  });
  const [loading, setLoading] = useState(true);

  const allProducts = categories.flatMap(c => (c.products || []) as Product[]);
  const [view, setView] = useState<'gallery' | 'admin'>('gallery'); 
  const [activeCategory, setActiveCategory] = useState<string>(initialCategories[0].id);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Fetch data and settings from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Categories
        const q = query(collection(db, 'categories'));
        const querySnapshot = await getDocs(q);
        const fetchedCats: Category[] = [];
        querySnapshot.forEach((doc) => {
          fetchedCats.push({ ...doc.data() } as Category);
        });
        
        if (fetchedCats.length > 0) {
          // Sort by sortOrder DESC (Larger = First), then fallback to name
          fetchedCats.sort((a, b) => {
            const orderA = a.sortOrder ?? 0;
            const orderB = b.sortOrder ?? 0;
            if (orderA !== orderB) return orderB - orderA;
            return a.name.localeCompare(b.name);
          });
          setCategories(fetchedCats);
          setActiveCategory(fetchedCats[0].id);
        }

        // Fetch Site Settings
        const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
        if (settingsSnap.exists()) {
          const data = settingsSnap.data() as any;
          setSiteSettings({
            siteTitle: data.siteTitle || siteSettings.siteTitle,
            siteKeywords: data.siteKeywords || siteSettings.siteKeywords,
            siteDescription: data.siteDescription || siteSettings.siteDescription
          });
        }
      } catch (err: any) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Sync Meta Tags with Site Settings
  useEffect(() => {
    document.title = siteSettings.siteTitle;
    
    // Update description meta
    let descMeta = document.querySelector('meta[name="description"]');
    if (!descMeta) {
      descMeta = document.createElement('meta');
      descMeta.setAttribute('name', 'description');
      document.head.appendChild(descMeta);
    }
    descMeta.setAttribute('content', siteSettings.siteDescription);

    // Update keywords meta
    let keywordsMeta = document.querySelector('meta[name="keywords"]');
    if (!keywordsMeta) {
      keywordsMeta = document.createElement('meta');
      keywordsMeta.setAttribute('name', 'keywords');
      document.head.appendChild(keywordsMeta);
    }
    keywordsMeta.setAttribute('content', siteSettings.siteKeywords);
  }, [siteSettings]);

  const [hoveredProductId, setHoveredProductId] = useState<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // ... 之前的逻辑保持一致，但需要处理 Admin 视图
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ container: scrollContainerRef });
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Scroll Spy and Back to Top logic
  useEffect(() => {
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "itemListElement": allProducts.map((p, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "Product",
          "name": p.name,
          "description": p.description,
          "image": p.image,
          "url": p.url
        }
      }))
    };
    
    const script = document.createElement('script');
    script.id = 'product-schema';
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schemaData);
    document.head.appendChild(script);
    
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const sections = categories.map(cat => document.getElementById(`section-${cat.id}`));
      const scrollPos = container.scrollTop + 150;
      setShowBackToTop(container.scrollTop > 500);
      sections.forEach((section, index) => {
        if (section && scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight) {
          setActiveCategory(categories[index].id);
        }
      });
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      const s = document.getElementById('product-schema');
      if (s) s.remove();
    };
  }, []);

  const scrollToCategory = (id: string) => {
    const element = document.getElementById(`section-${id}`);
    if (element && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: element.offsetTop - 20,
        behavior: 'smooth'
      });
    }
    setActiveCategory(id);
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (view === 'admin') {
    return <Admin onBack={() => {
      setView('gallery');
      window.location.reload(); 
    }} />;
  }

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans relative selection:bg-brand-blue/30 selection:text-white transition-colors duration-500 ${isDarkMode ? 'bg-zinc-950 text-white' : 'bg-zinc-50 text-zinc-900'}`}>
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Grid Pattern */}
        <div className={`absolute inset-0 bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] ${isDarkMode ? 'bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)]' : 'bg-[linear-gradient(to_right,#00000008_1px,transparent_1px),linear-gradient(to_bottom,#00000008_1px,transparent_1px)]'}`} />
        
        {/* Animated Glows */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: isDarkMode ? [0.1, 0.15, 0.1] : [0.05, 0.1, 0.05]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-brand-blue/20 rounded-full blur-[120px]" 
        />
      </div>

      {/* Sidebar */}
      <motion.nav 
        initial={{ x: -200, opacity: 0 }}
        animate={{ 
          width: isSidebarCollapsed ? 0 : 200,
          opacity: isSidebarCollapsed ? 0 : 1,
          x: isSidebarCollapsed ? -200 : 0
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`h-full border-r flex flex-col z-50 relative overflow-hidden shrink-0 transition-colors duration-500 ${isDarkMode ? 'bg-zinc-900/50 border-white/10' : 'bg-white/80 border-zinc-200 shadow-xl'}`}
      >
        <div className={`p-6 border-b flex items-center justify-end ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
          <button 
            onClick={() => setIsSidebarCollapsed(true)}
            className={`p-1.5 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-white/5 text-zinc-500' : 'hover:bg-zinc-100 text-zinc-400'}`}
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        <div className="flex-1 py-6 px-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              onClick={() => scrollToCategory(cat.id)}
              whileHover={{ x: 5 }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-300 group ${
                activeCategory === cat.id 
                  ? (isDarkMode ? 'bg-white/10 text-white shadow-inner' : 'bg-brand-blue/10 text-brand-blue font-bold')
                  : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100')
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 shrink-0 ${
                activeCategory === cat.id ? 'bg-brand-blue scale-125' : 'bg-transparent'
              }`} />
              <span className="font-medium text-xs text-left flex-1 whitespace-nowrap">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>

        {/* Sidebar Footer / Contact */}
        <div className={`p-6 mt-auto border-t ${isDarkMode ? 'border-white/10' : 'border-zinc-200'}`}>
          <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-zinc-50 border-zinc-200 shadow-sm'}`}>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-2">Support</p>
            <a 
              href="mailto:service@tokenplus.io" 
              className={`text-xs transition-colors block truncate font-medium ${isDarkMode ? 'text-zinc-400 hover:text-brand-blue' : 'text-zinc-600 hover:text-brand-blue'}`}
            >
              service@tokenplus.io
            </a>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <motion.main 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex-1 relative overflow-hidden flex flex-col"
      >
        {/* Header Content for SEO */}
        <h1 className="sr-only">TokenPlus - 全球领先的 AI 资源、GPU 算力与 API 货源批发链接器</h1>

        {/* TokenPlus Header */}
        <header className={`h-16 border-b transition-colors duration-500 z-40 shrink-0 flex items-center justify-between px-6 md:px-12 backdrop-blur-xl ${isDarkMode ? 'border-white/10 bg-zinc-950/80 text-white' : 'border-zinc-200 bg-white/80 text-zinc-900'}`}>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-4">
              {/* Sidebar Toggle Integrated into Header */}
              {isSidebarCollapsed && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  onClick={() => setIsSidebarCollapsed(false)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isDarkMode ? 'bg-brand-blue/20 text-brand-blue hover:bg-brand-blue/30' : 'bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'}`}
                >
                  <Menu size={20} />
                </motion.button>
              )}
            </div>
            
            <nav className="hidden lg:flex items-center gap-6">
              {[
                { name: 'API 算力', url: 'https://tokenplus.io' },
                { name: 'Token 交易', url: 'https://tokenplus.io' },
                { name: '资源分销', url: 'https://tokenplus.io' }
              ].map((item) => (
                <a 
                  key={item.name} 
                  href={item.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-sm transition-colors font-medium ${isDarkMode ? 'text-zinc-400 hover:text-brand-blue' : 'text-zinc-500 hover:text-brand-blue'}`}
                >
                  {item.name}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2.5 rounded-xl transition-all mr-2 ${isDarkMode ? 'bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10' : 'bg-zinc-100 border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'}`}
              title={isDarkMode ? "切换到白天模式" : "切换到夜晚模式"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <a 
              href="https://tokenplus.io" 
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-1.5 rounded-lg text-sm font-bold border transition-all ${isDarkMode ? 'bg-brand-blue/10 text-brand-blue border-brand-blue/20 hover:bg-brand-blue/20' : 'bg-white text-brand-blue border-brand-blue/20 hover:bg-brand-blue/5'}`}
            >
              登录
            </a>
            <a 
              href="https://tokenplus.io" 
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-1.5 rounded-lg bg-brand-blue text-white text-sm font-bold shadow-lg shadow-brand-blue/20 hover:scale-105 transition-all active:scale-95"
            >
              注册
            </a>
          </div>
        </header>

        {/* Scrollable Area */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto scroll-smooth relative"
        >
          <div className="max-w-[1600px] px-6 md:pl-16 md:pr-12 py-12 space-y-16 pb-64">
            {/* Dynamic Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.15 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1 }}
                  className={`absolute inset-0 ${categories.find(c => c.id === activeCategory)?.background || 'bg-zinc-950'}`}
                />
              </AnimatePresence>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(24,24,27,0)_0%,rgba(9,9,11,1)_100%)]" />
            </div>

            {categories.map((category) => (
              <CategorySection 
                key={category.id} 
                category={category} 
                isDarkMode={isDarkMode}
                products={
                  [...(category.products || [])].sort((a, b) => (b.sortOrder || 0) - (a.sortOrder || 0))
                }
                hoveredProductId={hoveredProductId}
                setHoveredProductId={setHoveredProductId}
              />
            ))}

            {/* TokenPlus Footer */}
            <footer className={`pt-20 pb-12 border-t transition-colors duration-500 ${isDarkMode ? 'border-white/10 text-zinc-400' : 'border-zinc-200 text-zinc-600'}`}>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center">
                      <Zap className="text-white" size={16} />
                    </div>
                    <span className={`font-display font-bold text-xl tracking-tight transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>TokenPlus</span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-md mb-8">
                    TokenPlus 【AI Token服务&资源链接器】AI 算力/Token Token二级交易所 AI 行业的 B2B 贸易交易所 API TOKEN货源批发集市。
                  </p>
                </div>

                <div>
                  <h5 className={`font-bold text-sm mb-6 transition-colors ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>法律条款</h5>
                  <ul className="space-y-4">
                    {[
                      { name: '服务条款', url: 'https://tokenplus.io/p/2-TermsofService' },
                      { name: '隐私条款', url: 'https://tokenplus.io/p/1-privacy' }
                    ].map(item => (
                      <li key={item.name}>
                        <a 
                          href={item.url} 
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:text-brand-blue transition-colors"
                        >
                          {item.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5 gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-zinc-600 text-xs">
                    AI 资源与服务链接器 © 2026 TokenPlus.io | <span className="text-zinc-500">service@tokenplus.io</span>
                  </p>
                  <button 
                    onClick={() => setView('admin')}
                    className="text-zinc-700 hover:text-white transition-colors text-[10px] uppercase tracking-widest font-bold"
                  >
                    管理后台
                  </button>
                </div>
              </div>
            </footer>
          </div>
        </div>

        {/* Back to Top Button */}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, y: 20, scale: 0.5 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.5 }}
              whileHover={{ 
                scale: 1.1, 
                backgroundColor: "var(--color-brand-blue)",
                boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)"
              }}
              whileTap={{ scale: 0.9 }}
              onClick={scrollToTop}
              className="fixed bottom-10 right-10 w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white shadow-2xl z-50 transition-all group"
            >
              <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
}

interface CategorySectionProps {
  category: Category;
  products: Product[];
  hoveredProductId: string | null;
  setHoveredProductId: (id: string | null) => void;
  isDarkMode: boolean;
}

function CategorySection({ 
  category, 
  products, 
  hoveredProductId,
  setHoveredProductId,
  isDarkMode
}: CategorySectionProps) {
  return (
    <section id={`section-${category.id}`} className="relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <motion.h2 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ amount: 0.3 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 100 }}
            className="text-3xl md:text-5xl font-display font-black tracking-tighter mb-3"
          >
            {category.name.split(' ').map((word, i) => (
              <span key={i} className={i === 0 ? (isDarkMode ? 'text-white' : 'text-zinc-900') : (isDarkMode ? 'text-white/30' : 'text-zinc-300')}>{word} </span>
            ))}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.4 }}
            className={`max-w-md text-base leading-relaxed ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}
          >
            {category.description}
          </motion.p>
        </div>
      </motion.div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
        {products.map((product, idx) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -80, scale: 0.95 }}
            whileInView={{ opacity: 1, x: 0, scale: 1 }}
            viewport={{ margin: "-20px" }}
            transition={{ 
              duration: 0.7, 
              delay: (idx % 4) * 0.08,
              type: "spring",
              stiffness: 120,
              damping: 14
            }}
          >
            {category.displayMode === 'tile' ? (
              <TileCard 
                product={product} 
                isDarkMode={isDarkMode}
              />
            ) : (
              <ProductCard 
                product={product} 
                index={idx}
                isDarkMode={isDarkMode}
                isHovered={hoveredProductId === product.id}
                isDimmed={hoveredProductId !== null && hoveredProductId !== product.id}
                onHover={() => setHoveredProductId(product.id)}
                onLeave={() => setHoveredProductId(null)}
              />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function TileCard({ product, isDarkMode }: { product: Product, isDarkMode: boolean }) {
  return (
    <motion.a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      layout
      whileHover={{ 
        scale: 1.05, 
        y: -10,
        boxShadow: isDarkMode ? "0 30px 60px -12px rgba(59, 130, 246, 0.4)" : "0 30px 60px -12px rgba(0, 0, 0, 0.1)"
      }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`group flex flex-col justify-center p-4 rounded-xl backdrop-blur-xl border transition-all duration-500 h-24 relative overflow-hidden ${isDarkMode ? 'bg-zinc-800/50 border-white/10 hover:border-brand-blue/50' : 'bg-white border-zinc-200 hover:border-brand-blue shadow-sm'}`}
    >
      <article className="flex items-center gap-4 w-full h-full relative z-10">
        {product.isAdminUsed && (
          <div className="absolute -top-2 -right-2 z-30 group/tooltip">
            {/* Refined breathing light */}
            <div className="relative w-4 h-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20 scale-150" />
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[4px] animate-pulse" />
              <div className="relative w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            </div>
            <div className="absolute top-full right-0 mt-3 px-2 py-1 bg-zinc-900/95 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] border border-white/10 shadow-2xl backdrop-blur-md font-bold">
              站长使用过
            </div>
          </div>
        )}
        {product.logo ? (
          <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 border transition-colors ${isDarkMode ? 'border-white/10 group-hover:border-brand-blue/30' : 'border-zinc-200 group-hover:border-brand-blue/30 shadow-sm'}`}>
            <img 
              src={product.logo} 
              alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 border transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/10 group-hover:bg-brand-blue/10' : 'bg-zinc-50 border-zinc-200 group-hover:bg-brand-blue/5'}`}>
            <LayoutGrid size={20} className="text-zinc-500 group-hover:text-brand-blue transition-colors" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className={`font-display font-bold text-sm transition-colors truncate ${isDarkMode ? 'text-white' : 'text-zinc-900 group-hover:text-brand-blue'}`}>
            {product.name}
          </h4>
          <p className={`text-[11px] line-clamp-2 leading-snug mt-1 transition-colors ${isDarkMode ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-700'}`}>
            {product.description}
          </p>
        </div>
      </article>
      
      {/* Subtle background glow on hover */}
      <div className="absolute inset-0 bg-linear-to-tr from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.a>
  );
}

interface ProductCardProps {
  product: Product;
  index: number;
  isHovered: boolean;
  isDimmed: boolean;
  onHover: () => void;
  onLeave: () => void;
  isDarkMode: boolean;
}

function ProductCard({ 
  product, 
  index, 
  isHovered,
  isDimmed,
  onHover,
  onLeave,
  isDarkMode
}: ProductCardProps) {
  return (
    <motion.a
      href={product.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      layout
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      whileHover={{ 
        scale: 1.08,
        y: -15,
        rotateX: -4,
        rotateY: 4,
        z: 50,
        transition: { type: "spring", stiffness: 200, damping: 20 }
      }}
      whileTap={{ scale: 0.97 }}
      transition={{ 
        layout: { type: "spring", stiffness: 200, damping: 25 },
        default: { delay: index * 0.01 }
      }}
      style={{ perspective: 1200, transformStyle: "preserve-3d" }}
      className={`
        relative group block rounded-xl overflow-hidden backdrop-blur-xl border transition-all duration-500
        ${isDarkMode ? 'bg-zinc-800/40 border-white/10' : 'bg-white border-zinc-200 shadow-sm'}
        ${isDimmed ? 'opacity-40 grayscale scale-[0.98]' : 'opacity-100 grayscale-0 scale-100'}
        ${isHovered ? 'border-brand-blue/60 shadow-2xl z-50' : 'z-10 shadow-lg shadow-black/5'}
      `}
    >
      <article>
        {product.isAdminUsed && (
          <div className="absolute top-3 right-3 z-30 group/tooltip">
            {/* Refined breathing light */}
            <div className="relative w-5 h-5 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-25 scale-125" />
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[6px] animate-pulse" />
              <div className="relative w-3 h-3 bg-emerald-500 rounded-full border-2 border-white shadow-[0_0_12px_rgba(16,185,129,1)]" />
            </div>
            <div className="absolute top-full right-0 mt-3 px-2 py-1 bg-zinc-900/95 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-[100] border border-white/10 shadow-2xl backdrop-blur-md font-bold">
              站长使用过
            </div>
          </div>
        )}
        {/* Animated Glow Overlay */}
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-linear-to-tr from-brand-blue/10 via-transparent to-brand-blue/5 pointer-events-none z-20"
            />
          )}
        </AnimatePresence>

        {/* Product Image Area */}
        <div className="relative">
          <div className="aspect-[16/8] overflow-hidden relative">
            <motion.img 
              src={product.image} 
              alt={product.name}
              referrerPolicy="no-referrer"
              animate={{ scale: isHovered ? 1.15 : 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="w-full h-full object-cover"
            />
            <div className={`absolute inset-0 bg-linear-to-t via-transparent to-transparent opacity-40 ${isDarkMode ? 'from-zinc-950' : 'from-zinc-200'}`} />
            
            {/* Tech Scanline Effect */}
            <div className={`absolute inset-0 pointer-events-none opacity-20 ${isDarkMode ? 'bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%]' : ''}`} />
          </div>

          <div className={`py-2 px-4 border-t relative z-10 transition-colors ${isDarkMode ? 'bg-zinc-800/80 border-white/10' : 'bg-white/90 border-zinc-100 shadow-inner'}`}>
            <div className="flex justify-between items-center">
              <h4 className={`font-display font-bold text-sm transition-colors truncate pr-2 ${isDarkMode ? 'text-white' : 'text-zinc-900 group-hover:text-brand-blue'}`}>
                {product.name}
              </h4>
              <span className={`font-mono text-[10px] font-bold shrink-0 transition-colors ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400 group-hover:text-brand-blue/70'}`}>{product.price}</span>
            </div>
          </div>
        </div>
        
        {/* Reveal Description */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ 
                height: { type: "spring", stiffness: 200, damping: 25 },
                opacity: { duration: 0.3 }
              }}
              className={`overflow-hidden transition-colors ${isDarkMode ? 'bg-zinc-800/60' : 'bg-zinc-50/80'}`}
            >
              <div className="px-4 pb-4 pt-1">
                <motion.p 
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className={`text-[11px] leading-relaxed line-clamp-2 transition-colors ${isDarkMode ? 'text-zinc-500 group-hover:text-zinc-400' : 'text-zinc-500 group-hover:text-zinc-700'}`}
                >
                  {product.description}
                </motion.p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </article>
    </motion.a>
  );
}
