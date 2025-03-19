import { LayerConfig, Pattern } from '../types/types';

class GrayscalePattern implements Pattern {
  name = 'grayscale-fixed';

  private calculateNonLinearPercentage(index: number, total: number): number {
    const normalizedValue = Math.pow((index + 1) / total, 2);
    return Math.min(Math.round(normalizedValue * 100), 100);
  }

  async execute(imageData: ImageData, maxHeight: number = 100): Promise<LayerConfig[]> {
    return [
      { color: '#000000', heightPercentage: this.calculateNonLinearPercentage(0, 4), td: 0.6 },
      { color: '#666666', heightPercentage: this.calculateNonLinearPercentage(1, 4), td: 1.4 },
      { color: '#CCCCCC', heightPercentage: this.calculateNonLinearPercentage(2, 4), td: 2.8 },
      { color: '#FFFFFF', heightPercentage: this.calculateNonLinearPercentage(3, 4), td: 5.0 }
    ];
  }
}

export const grayscalePattern = new GrayscalePattern(); 