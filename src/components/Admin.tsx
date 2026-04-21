import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, LogOut, Plus, Trash2, Edit3, Save, X, PlusCircle, ShieldCheck, Database, Globe
} from 'lucide-react';
import { Category, Product } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, query, getDocs, doc, setDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { categories as localData } from '../data';

export default function Admin({ onBack }: { onBack: () => void }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [data, setData] = useState<Category[]>([]);
  const [settings, setSettings] = useState({ siteTitle: '', siteKeywords: '', siteDescription: '' });
  const [editingSettings, setEditingSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{catId: string, prodId: string} | null>(null);
  const [tempData, setTempData] = useState<any>(null);
  
  // Custom Confirmation States
  const [confirmingAction, setConfirmingAction] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'categories'));
      const querySnapshot = await getDocs(q);
      const fetched: Category[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ ...doc.data() } as Category);
      });
      fetched.sort((a, b) => a.id.localeCompare(b.id));
      setData(fetched);

      const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
      if (settingsSnap.exists()) {
        setSettings(settingsSnap.data() as any);
      }
    } catch (err: any) {
      console.error('Failed to fetch from Firestore', err);
      // Don't alert here to avoid blocking app init
    } finally {
      setLoading(false);
    }
  };

  const migrateData = async () => {
    setConfirmingAction({
      message: '确定要将本地原始数据上传到云端覆盖现有数据吗？此操作会将现有云端数据（如有）合并或覆盖。',
      onConfirm: async () => {
        setSaving(true);
        const timeout = setTimeout(() => {
          setSaving(false);
          setConfirmingAction({ message: '保存超时，可能数据量较大或连接不稳定，请稍后刷新。', onConfirm: () => setConfirmingAction(null) });
        }, 15000);

        try {
          const batch = writeBatch(db);
          // Standardize local data before upload to ensure common structure
          const categoriesToSync = localData.map(c => ({
            ...c,
            products: c.products || [],
            layout: c.layout || 'grid'
          }));

          for (const cat of categoriesToSync) {
            const docRef = doc(db, 'categories', cat.id);
            batch.set(docRef, cat);
          }
          
          await batch.commit();
          clearTimeout(timeout);
          
          // Re-fetch immediately to update the data length and hide the button
          const q = query(collection(db, 'categories'));
          const querySnapshot = await getDocs(q);
          const fetched: Category[] = [];
          querySnapshot.forEach((docSnap) => {
            fetched.push({ ...docSnap.data() } as Category);
          });
          fetched.sort((a, b) => a.id.localeCompare(b.id));
          setData(fetched);
          
          setConfirmingAction({ 
            message: `成功同步 ${fetched.length} 个分类！此按钮现在应当消失。`, 
            onConfirm: () => setConfirmingAction(null) 
          });
        } catch (err: any) {
          clearTimeout(timeout);
          console.error('Migration failed:', err);
          setConfirmingAction({ message: '迁移失败：' + (err.message || '权限不足'), onConfirm: () => setConfirmingAction(null) });
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const saveOneCategory = async (cat: Category) => {
    setSaving(true);
    const timeout = setTimeout(() => {
      setSaving(false);
      setConfirmingAction({ message: '云端同步超时，请手动刷新页面。', onConfirm: () => setConfirmingAction(null) });
    }, 8000);

    try {
      await setDoc(doc(db, 'categories', cat.id), cat);
      clearTimeout(timeout);
      setData(prev => prev.map(c => c.id === cat.id ? cat : c));
    } catch (err: any) {
      clearTimeout(timeout);
      setConfirmingAction({ message: '保存失败：' + (err.message || '网络错误'), onConfirm: () => setConfirmingAction(null) });
    } finally {
      setSaving(false);
      setConfirmingAction(null);
    }
  };

  const deleteCategoryFromDB = async (id: string) => {
    setSaving(true);
    try {
      await deleteDoc(doc(db, 'categories', id));
      setData(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('删除失败');
    } finally {
      setSaving(false);
      setConfirmingAction(null);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const envUsername = import.meta.env.VITE_ADMIN_USERNAME;
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD;

    if (!envUsername || !envPassword) {
      setError('后台认证配置缺失，请在环境变量中设置 VITE_ADMIN_USERNAME 和 VITE_ADMIN_PASSWORD');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Check credentials from env
      if (username === envUsername && password === envPassword) {
        // Step 2: Authenticate with Firebase for DB access
        await signInAnonymously(auth);
        setIsLoggedIn(true);
        setError('');
      } else {
        setError('用户名或密码错误');
      }
    } catch (err) {
      setError('Firebase 权限验证失败');
    } finally {
      setLoading(false);
    }
  };

  const addCategory = async (mode: 'card' | 'tile') => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: `新${mode === 'card' ? '大图' : '小图'}分类`,
      description: '点击编辑修改描述',
      layout: 'grid',
      displayMode: mode,
      background: 'bg-zinc-900',
      accentColor: '#3b82f6',
      products: []
    };
    setSaving(true);
    try {
      await setDoc(doc(db, 'categories', newCat.id), newCat);
      setData([...data, newCat]);
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingAction({
      message: '确定要彻底删除该分类及其所有产品吗？此操作不可逆。',
      onConfirm: () => deleteCategoryFromDB(id)
    });
  };

  const addProduct = (catId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const cat = data.find(c => c.id === catId);
    if (!cat) return;

    const newProducts = [...(cat.products || [])];
    const newProd = {
      id: `prod-${Date.now()}`,
      name: '新产品',
      description: '产品描述',
      price: '价格',
      image: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format',
      category: catId,
      url: 'https://tokenplus.io',
      details: ['详情1'],
      sortOrder: (cat.products?.length || 0) + 1
    };
    newProducts.push(newProd);
    
    saveOneCategory({ ...cat, products: newProducts });
  };

  const deleteProduct = (catId: string, prodId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingAction({
      message: '确认要从该分类中移除此产品吗？',
      onConfirm: () => {
        const cat = data.find(c => c.id === catId);
        if (!cat) return;
        const newProds = (cat.products || []).filter(p => p.id !== prodId);
        saveOneCategory({ ...cat, products: newProds });
      }
    });
  };

  const startEditCategory = (cat: Category, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingCategory(cat.id);
    setTempData({ ...cat });
  };

  const startEditProduct = (catId: string, prod: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem({ catId, prodId: prod.id });
    setTempData({ ...prod });
  };

  const handleSaveCategory = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingAction({
      message: '确认保存对该分类的修改？',
      onConfirm: () => {
        saveOneCategory(tempData);
        setEditingCategory(null);
      }
    });
  };

  const handleSaveProduct = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingAction({
      message: '确认保存对该产品的详细修改？',
      onConfirm: () => {
        const cat = data.find(c => c.id === editingItem?.catId);
        if (!cat || !editingItem) return;
        const newProds = (cat.products || []).map(p => p.id === editingItem.prodId ? { ...tempData, category: cat.id } : p);
        saveOneCategory({ ...cat, products: newProds });
        setEditingItem(null);
      }
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...settings,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setEditingSettings(false);
    } catch (err) {
      alert('保存设置失败');
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1)_0%,transparent_100%)]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 rounded-3xl bg-zinc-900/50 backdrop-blur-2xl border border-white/10 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-brand-blue rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-blue/20">
              <ShieldCheck className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-display font-bold text-white">TokenPlus Admin</h1>
            <p className="text-zinc-500 text-sm mt-2">管理员登录控制台</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">用户名</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-brand-blue/50 focus:ring-0 transition-all outline-none"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">密码</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white focus:border-brand-blue/50 focus:ring-0 transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-400 text-xs px-1">{error}</p>}
            <button 
              type="submit"
              className="w-full h-12 bg-brand-blue text-white font-bold rounded-xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              登 录
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="w-full text-zinc-500 text-sm hover:text-white transition-colors"
            >
              返回主页
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative">
      {/* Saving Overlay */}
      {saving && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
            <p className="font-bold text-white tracking-widest animate-pulse">正在保存同步...</p>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl"
          >
            <h3 className="text-xl font-bold mb-4">确认操作</h3>
            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">{confirmingAction.message}</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setConfirmingAction(null)}
                className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all"
              >
                取消
              </button>
              <button 
                onClick={confirmingAction.onConfirm}
                className="flex-1 py-3 rounded-xl bg-brand-blue text-white font-bold shadow-lg shadow-brand-blue/20 hover:scale-[1.02] transition-all"
              >
                确定执行
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Admin Header */}
      <header className="h-16 border-b border-white/10 glass flex items-center justify-between px-6 md:px-12 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400">
            <ArrowLeft size={20} />
          </button>
          <h2 className="font-display font-bold text-lg">内容管理后台</h2>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsLoggedIn(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <LogOut size={16} /> 退出
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-12 space-y-12">
        <section className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2"><Globe size={20} className="text-brand-blue" /> 网站 SEO 设置</h2>
            {!editingSettings ? (
              <button 
                onClick={() => setEditingSettings(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-sm rounded-lg flex items-center gap-2"
              >
                <Edit3 size={16} /> 编辑设置
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button 
                  onClick={saveSettings}
                  className="px-4 py-2 bg-brand-blue text-white text-sm font-bold rounded-lg flex items-center gap-2"
                >
                  <Save size={16} /> 保存设置
                </button>
                <button 
                  onClick={() => setEditingSettings(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-sm rounded-lg"
                >
                  取消
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">页面标题 (Title)</label>
                <input 
                  disabled={!editingSettings}
                  value={settings.siteTitle}
                  onChange={e => setSettings({...settings, siteTitle: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                  placeholder="例如: 极客 AI 算力货源站"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">网站关键词 (Keywords)</label>
                <input 
                  disabled={!editingSettings}
                  value={settings.siteKeywords}
                  onChange={e => setSettings({...settings, siteKeywords: e.target.value})}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm disabled:opacity-50"
                  placeholder="关键词以英文逗号分隔"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-zinc-500 uppercase tracking-widest mb-1.5 font-bold">网站描述 (Description)</label>
              <textarea 
                disabled={!editingSettings}
                value={settings.siteDescription}
                onChange={e => setSettings({...settings, siteDescription: e.target.value})}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm h-[110px] resize-none disabled:opacity-50"
                placeholder="简短介绍您的网站内容..."
              />
            </div>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-display font-black tracking-tight">分类与产品集</h1>
            <p className="text-zinc-500 mt-2">在这里管理展示的产品和分类布局。</p>
          </div>
          <div className="flex items-center gap-3">
            {data.length === 0 && !loading && (
              <button 
                type="button"
                onClick={migrateData}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-all"
              >
                <Database size={18} /> 从本地迁移初始化
              </button>
            )}
            <button 
              type="button"
              onClick={(e) => addCategory('card')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue text-white text-sm font-bold shadow-lg shadow-brand-blue/20 hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} /> 新增大图分类
            </button>
            <button 
              type="button"
              onClick={(e) => addCategory('tile')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-white/10 text-white text-sm font-bold hover:bg-zinc-700 active:scale-95 transition-all"
            >
              <Plus size={18} /> 新增小图分类
            </button>
          </div>
        </div>

        <div className="space-y-10 pb-32">
          {data.map((cat) => (
            <div key={cat.id} className="rounded-3xl border border-white/10 bg-zinc-900/30 overflow-hidden shadow-sm">
              <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                {editingCategory === cat.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 mr-4">
                    <input autoFocus value={tempData.name} onChange={e => setTempData({...tempData, name: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:border-brand-blue/50" placeholder="分类名称" />
                    <input value={tempData.description} onChange={e => setTempData({...tempData, description: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm outline-none focus:border-brand-blue/50" placeholder="分类描述" />
                    <select value={tempData.displayMode} onChange={e => setTempData({...tempData, displayMode: e.target.value})} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-zinc-400">
                      <option value="card">Card (大图)</option>
                      <option value="tile">Tile (小图列表)</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-xl font-bold flex items-center gap-3">
                      {cat.name}
                      <span className="text-[10px] uppercase tracking-widest text-brand-blue bg-brand-blue/10 px-2 py-0.5 rounded-full">{cat.displayMode}</span>
                    </h3>
                    <p className="text-zinc-500 text-sm mt-1">{cat.description}</p>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  {editingCategory === cat.id ? (
                    <>
                      <button type="button" onClick={(e) => handleSaveCategory(e)} className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30">
                        <Save size={18} />
                      </button>
                      <button type="button" onClick={() => setEditingCategory(null)} className="p-2 bg-white/5 text-zinc-500 rounded-lg hover:text-white">
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={(e) => startEditCategory(cat, e)} className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:text-white hover:bg-white/10">
                        <Edit3 size={18} />
                      </button>
                      <button type="button" onClick={(e) => deleteCategory(cat.id, e)} className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:text-rose-400 hover:bg-rose-500/10">
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(cat.products || []).sort((a,b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(prod => (
                    <div key={prod.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 group hover:border-brand-blue/30 transition-all">
                      {editingItem?.prodId === prod.id ? (
                        <div className="space-y-3">
                          <input autoFocus value={tempData.name} onChange={e => setTempData({...tempData, name: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs" placeholder="产品名" />
                          <textarea value={tempData.description} onChange={e => setTempData({...tempData, description: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs h-16" placeholder="描述" />
                          <div className="grid grid-cols-2 gap-2">
                            <input value={tempData.price} onChange={e => setTempData({...tempData, price: e.target.value})} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs" placeholder="价格标签" />
                            <input type="number" value={tempData.sortOrder} onChange={e => setTempData({...tempData, sortOrder: parseInt(e.target.value) || 0})} className="bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs" placeholder="排序ID" />
                          </div>
                          <input value={tempData.url} onChange={e => setTempData({...tempData, url: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs" placeholder="链接" />
                          <input value={tempData.image} onChange={e => setTempData({...tempData, image: e.target.value})} className="w-full bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-xs" placeholder="图片URL" />
                          
                          <div className="flex gap-2 pt-2">
                            <button type="button" onClick={(e) => handleSaveProduct(e)} className="flex-1 py-1.5 bg-brand-blue text-white text-xs font-bold rounded-lg">保存</button>
                            <button type="button" onClick={() => setEditingItem(null)} className="flex-1 py-1.5 bg-white/10 text-zinc-400 text-xs rounded-lg">取消</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-4">
                          <img src={prod.image} className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0" alt="" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-sm truncate">{prod.name}</h4>
                              <span className="text-[10px] text-zinc-600 font-mono">#{prod.sortOrder}</span>
                            </div>
                            <p className="text-zinc-500 text-[10px] line-clamp-2 mt-1">{prod.description}</p>
                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button type="button" onClick={(e) => startEditProduct(cat.id, prod, e)} className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white"><Edit3 size={12} /></button>
                              <button type="button" onClick={(e) => deleteProduct(cat.id, prod.id, e)} className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-rose-400"><Trash2 size={12} /></button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <button 
                    type="button"
                    onClick={(e) => addProduct(cat.id, e)}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-zinc-500 hover:border-brand-blue/30 hover:text-brand-blue transition-all group"
                  >
                    <PlusCircle size={32} className="mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold">添加产品项</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
