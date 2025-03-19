import { LayerConfig, Pattern } from '../types/types';

class GrayscaleDistributedPattern implements Pattern {
  name = 'grayscale-distributed';

  async execute(imageData: ImageData, maxHeight: number = 100): Promise<LayerConfig[]> {
    return [
      { color: '#000000', heightPercentage: 25, td: 0.6 },
      { color: '#404040', heightPercentage: 50, td: 1.4 },
      { color: '#808080', heightPercentage: 75, td: 2.0 },
      { color: '#ffffff', heightPercentage: 100, td: 5.0 }
    ];
  }
}

export const grayscaleDistributedPattern = new GrayscaleDistributedPattern(); 