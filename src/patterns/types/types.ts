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
