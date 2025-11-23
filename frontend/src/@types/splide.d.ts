declare module '@splidejs/react-splide' {
  import { ComponentType, ReactNode } from 'react';

  export interface Options {
    type?: 'slide' | 'loop' | 'fade';
    perPage?: number | 'auto';
    perMove?: number;
    gap?: string | number;
    pagination?: boolean;
    arrows?: boolean;
    drag?: boolean;
    snap?: boolean;
    focus?: number | 'center';
    fixedWidth?: string | number;
    fixedHeight?: string | number;
    padding?: { left?: number | string; right?: number | string };
    updateOnMove?: boolean;
    trimSpace?: boolean;
    [key: string]: any;
  }

  export interface SplideProps {
    options?: Options;
    children?: ReactNode;
    className?: string;
    'aria-label'?: string;
    onMove?: (splide: any, newIndex: number) => void;
    onMoved?: (splide: any, newIndex: number) => void;
  }

  export interface SplideSlideProps {
    children?: ReactNode;
    className?: string;
  }

  export const Splide: ComponentType<SplideProps>;
  export const SplideSlide: ComponentType<SplideSlideProps>;
}

declare module '@splidejs/splide/dist/css/splide.min.css' {
  const content: any;
  export default content;
}
