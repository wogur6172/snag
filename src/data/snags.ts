export type SnagCategory = 'all' | (string & {});

export type SnagDrawingPoint = {
  x: number;
  y: number;
};

export type SnagDrawingStroke = {
  color: string;
  id: string;
  points: SnagDrawingPoint[];
  width: number;
};

export type SnagItem = {
  category: SnagCategory;
  canvasX: number;
  canvasY: number;
  createdAt: number;
  excludeFromAll?: boolean;
  id: string;
  kind?: 'image' | 'text';
  imageHeight?: number;
  imageUri?: string;
  imageWidth?: number;
  previewUri?: string;
  layerIndex?: number;
  originSnagId?: string;
  ownerId?: string;
  pendingSync?: boolean;
  rotate: string;
  size: number;
  text?: string;
  title: string;
  updatedAt?: number;
};

type SnagCategoryBackground = 'grid' | 'dots' | 'shelves' | 'journal';

export const SNAG_CATEGORIES: { background?: SnagCategoryBackground; backgroundStrength?: number; color?: string; id: SnagCategory; title: string }[] = [
  { background: 'grid', backgroundStrength: 0.62, color: '#FFD6D6', id: 'category-1', title: 'Category 1' },
  { id: 'all', title: 'All' },
];
