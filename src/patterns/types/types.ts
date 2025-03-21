export interface LayerConfig {
  color: string;
  heightPercentage: number;
  td: number;
}

export interface DominantColor {
  color: string;
  frequency: number;
  rgb: [number, number, number];
  hsv: [number, number, number];
}

export interface Pattern {
  name: string;
  execute: (imageData: ImageData, maxHeight?: number) => Promise<LayerConfig[]>;
}

export enum HeightMode {
  LUMINANCE = 'luminance',
  COLOR_MAPPING = 'color-mapping'
}

export interface HeightModeConfig {
  mode: HeightMode;
  label: string;
}
