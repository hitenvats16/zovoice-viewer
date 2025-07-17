export interface Section {
  section_id: string;
  content: string;
  content_type: string;
  page_number: number;
  raw_text: string | null;
  level: string | null;
}

export interface Chapter {
  chapter_id: string;
  title: string;
  sections: Section[];
}

export interface BookData {
  title: string;
  author: string;
  data: {
    book_id: string;
    title: string;
    author: string;
    chapters: Chapter[];
  };
  s3_public_link: string;
  id: number;
  s3_key: string;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface OutputChapter {
  chapter_id: string;
  chapter_title: string;
  chapter_content: string;
  meta_data: Record<string, any>;
}

export interface OutputData {
  chapters: OutputChapter[];
  book_id: number;
  audio_generation_params: {
    exaggeration: number;
    temperature: number;
    cfg: number;
    seed: number;
  };
}

export interface Command {
  id: string;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
  action: (chapterId: string, position: number) => void;
}

export interface CommandMode {
  active: boolean;
  chapterId: string;
  position: number;
  query: string;
  coords?: { x: number; y: number };
}

export interface CurrentWord {
  word: string;
  chapterId: string;
  start: number;
  end: number;
}

export interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface SectionMap {
  start: number;
  end: number;
  pageNumber: number;
  sectionId: string;
  score?: number;
} 