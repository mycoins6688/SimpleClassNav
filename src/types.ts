export type LayoutType = 'grid' | 'masonry' | 'carousel' | 'bento';
export type DisplayMode = 'card' | 'tile';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: string;
  image: string;
  category: string;
  url: string;
  logo?: string;
  details: string[];
  sortOrder?: number; // 添加排序优先级，数字越小越靠前
  isAdminUsed?: boolean; // 站长是否使用过
}

export interface Category {
  id: string;
  name: string;
  description: string;
  layout: LayoutType;
  displayMode: DisplayMode;
  background: string; // Tailwind class or CSS gradient
  accentColor: string;
  sortOrder?: number; // 添加排序优先级
  products?: Product[]; // 嵌套的产品列表
}
