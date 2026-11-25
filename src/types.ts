export interface ElementStyle {
  fontSize: 'xl' | '2xl' | '3xl' | '4xl' | 'normal' | string;
  fontWeight: 'bold' | 'medium' | 'normal' | string;
  align: 'left' | 'center' | 'right';
  color: 'heading' | 'body' | 'accent' | 'muted' | string;
  backgroundColor: 'transparent' | 'accent' | 'card_bg' | string;
}

export interface SlideElement {
  id: string;
  type: 'title' | 'subtitle' | 'paragraph' | 'bullet_list' | 'image';
  content: string | string[]; // string for simple types, array for list
  x: number; // relative coordinate percentage (0-100)
  y: number; // relative coordinate percentage (0-100)
  w: number; // width percentage (0-100)
  h: number; // height percentage (0-100)
  style: ElementStyle;
}

export interface Slide {
  id: string;
  title: string;
  notes: string;
  elements: SlideElement[];
}

export type ThemeType = 'dark_cyberpunk' | 'glass_slate' | 'editorial_serif' | 'brutalist_chrome' | 'royal_emerald';
export type TransitionType = 'fade' | 'slide-left' | 'zoom-in' | 'perspective-rotate' | 'carousel';

export interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  color: string;
  activeSlideId: string;
  x?: number;
  y?: number;
}

export interface Presentation {
  name: string;
  theme: ThemeType;
  transition: TransitionType;
  slides: Slide[];
}
