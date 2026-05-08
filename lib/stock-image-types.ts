import { StockImage } from '@/app/api/stock-search/route';
import { TaggedImage } from '@/app/api/lifestyle-images/bulk-import/route';

export type { StockImage, TaggedImage };

export interface SearchFilters {
  sources: ('pexels' | 'unsplash')[];
  perPage: number;
  orientation: 'portrait' | 'landscape' | 'square';
}

export interface TaggingProgress {
  total: number;
  completed: number;
  failed: number;
  currentImage?: string;
}

export interface TaggingError {
  imageId: string;
  imageUrl: string;
  error: string;
}

export type WorkflowPhase = 1 | 2 | 3 | 4 | 5;

export interface WorkflowState {
  phase: WorkflowPhase;
  searchResults: StockImage[];
  selectedIds: Set<string>;
  taggedResults: TaggedImage[];
  taggingProgress: TaggingProgress;
  taggingErrors: TaggingError[];
}
