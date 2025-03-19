import { LayerConfig, Pattern } from '../types/types';
import { rgbToHex, calculateTransmissivity } from '../utils/colorUtils';

interface PixelInfo {
  r: number;
  g: number;
  b: number;
  luminance: number;
  count: number;
}

class PosterizedPattern implements Pattern {
  name = 'posterized';

  private calculateLuminance(r: number, g: number, b: number): number {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  private calculateNonLinearPercentage(index: number, total: number): number {
    // Usando uma curva exponencial para distribuir os valores
    const normalizedValue = Math.pow((index + 1) / total, 1.8); // Aumentamos o expoente para mais contraste
    return Math.min(Math.round(normalizedValue * 100), 100);
  }

  async execute(imageData: ImageData, maxHeight: number = 100): Promise<LayerConfig[]> {
    const numLevels = 5;
    const levels: PixelInfo[] = Array(numLevels).fill(null).map(() => ({
      r: 0,
      g: 0,
      b: 0,
      luminance: 0,
      count: 0
    }));

    // Primeira passagem: calcula a distribuição de luminância
    const luminanceHistogram = new Array(256).fill(0);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const luminance = Math.round(this.calculateLuminance(r, g, b));
      luminanceHistogram[luminance]++;
    }

    // Calcula os limites dos níveis para distribuição mais uniforme
    const totalPixels = imageData.width * imageData.height;
    const pixelsPerLevel = totalPixels / numLevels;
    const levelThresholds = new Array(numLevels - 1);
    
    let currentCount = 0;
    let thresholdIndex = 0;
    
    for (let i = 0; i < 256 && thresholdIndex < levelThresholds.length; i++) {
      currentCount += luminanceHistogram[i];
      if (currentCount >= pixelsPerLevel * (thresholdIndex + 1)) {
        levelThresholds[thresholdIndex] = i;
        thresholdIndex++;
      }
    }

    // Segunda passagem: agrupa os pixels nos níveis
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const luminance = this.calculateLuminance(r, g, b);

      // Determina o nível baseado nos thresholds calculados
      let levelIndex = 0;
      while (levelIndex < levelThresholds.length && luminance > levelThresholds[levelIndex]) {
        levelIndex++;
      }

      levels[levelIndex].r += r;
      levels[levelIndex].g += g;
      levels[levelIndex].b += b;
      levels[levelIndex].luminance += luminance;
      levels[levelIndex].count++;
    }

    // Calcula a média das cores para cada nível
    const pattern: LayerConfig[] = levels.map((level, index) => {
      if (level.count === 0) {
        // Se não houver pixels neste nível, interpola
        const gray = Math.round((index / (numLevels - 1)) * 255);
        return {
          color: rgbToHex(gray, gray, gray),
          heightPercentage: this.calculateNonLinearPercentage(index, numLevels),
          td: calculateTransmissivity(gray / 255)
        };
      }

      const r = Math.round(level.r / level.count);
      const g = Math.round(level.g / level.count);
      const b = Math.round(level.b / level.count);
      const avgLuminance = level.luminance / level.count;

      return {
        color: rgbToHex(r, g, b),
        heightPercentage: this.calculateNonLinearPercentage(index, numLevels),
        td: calculateTransmissivity(avgLuminance / 255)
      };
    });

    // Ordena o padrão pela luminância
    pattern.sort((a, b) => {
      const getLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return this.calculateLuminance(r, g, b);
      };
      
      return getLuminance(a.color) - getLuminance(b.color);
    });

    return pattern;
  }
}

export const posterizedPattern = new PosterizedPattern(); 