import { Category } from './types';
import rawData from './data.json';

/**
 * 核心导航与内容配置
 * 
 * 现在通过 JSON 文件进行持久化管理，可以通过后台界面进行修改。
 */
export const categories: Category[] = rawData as Category[];
