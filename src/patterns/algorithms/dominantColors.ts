import { LayerConfig, Pattern } from '../types/types';
import { rgbToHsl, hslToRgb } from '../../utils/colorConversion';

interface PixelInfo {
  color: string;
  count: number;
  hue: number;
  saturation: number;
  lightness: number;
  r: number;
  g: number;
  b: number;
}

export class DominantColorsPattern implements Pattern {
  name = 'dominant-colors';
  private DEFAULT_COLORS = 5;
  private SIMILARITY_THRESHOLD = 0.25;
  private QUANTIZE_LEVELS = 64;

  constructor(private maxColors: number = 5) {
    this.maxColors = Math.min(Math.max(2, maxColors), 8); // Limita entre 2 e 8 cores
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const validR = Math.min(255, Math.max(0, Math.round(r)));
    const validG = Math.min(255, Math.max(0, Math.round(g)));
    const validB = Math.min(255, Math.max(0, Math.round(b)));
    
    return '#' + [validR, validG, validB].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  }

  private quantizeColor(value: number): number {
    return Math.round(value / (256 / this.QUANTIZE_LEVELS)) * (256 / this.QUANTIZE_LEVELS);
  }

  private colorDistance(color1: PixelInfo, color2: PixelInfo): number {
    // Para cores escuras, usamos um threshold mais relaxado
    if (color1.lightness < 0.2 && color2.lightness < 0.2) {
      return 0.5; // Força agrupamento de cores escuras
    }

    // Calcula distância no espaço RGB (20% do peso)
    const rDiff = (color1.r - color2.r) / 255;
    const gDiff = (color1.g - color2.g) / 255;
    const bDiff = (color1.b - color2.b) / 255;
    const rgbDistance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

    // Calcula distância no espaço HSL (80% do peso)
    const hueDiff = Math.min(Math.abs(color1.hue - color2.hue), 1 - Math.abs(color1.hue - color2.hue));
    const satDiff = Math.abs(color1.saturation - color2.saturation);
    const lightDiff = Math.abs(color1.lightness - color2.lightness);

    // Dando muito mais peso para diferenças de matiz em cores saturadas
    const saturationWeight = Math.max(color1.saturation, color2.saturation);
    const hslDistance = Math.sqrt(
      (hueDiff * hueDiff * 6 * saturationWeight) + 
      (satDiff * satDiff * 2) + 
      (lightDiff * lightDiff)
    );

    return rgbDistance * 0.2 + hslDistance * 0.8;
  }

  private getColorImportance(pixel: PixelInfo): number {
    // Dá muito mais importância para cores saturadas e com boa luminosidade
    const saturationImportance = Math.pow(pixel.saturation, 1.5) * 2;
    const lightnessImportance = 1 - Math.abs(pixel.lightness - 0.5);
    const frequencyImportance = Math.log10(pixel.count + 1) / 10;
    
    return saturationImportance + lightnessImportance + frequencyImportance;
  }

  async execute(imageData: ImageData, maxHeight: number = 100): Promise<LayerConfig[]> {
    const { data, width, height } = imageData;
    const colorMap = new Map<string, PixelInfo>();
    const totalPixels = width * height;

    // Primeiro passo: Quantização e contagem inicial
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;

      const r = this.quantizeColor(data[i]);
      const g = this.quantizeColor(data[i + 1]);
      const b = this.quantizeColor(data[i + 2]);
      const [h, s, l] = rgbToHsl(r, g, b);

      // Ignora pixels muito claros
      if (l > 0.95) continue;

      const colorKey = `${r},${g},${b}`;
      
      if (colorMap.has(colorKey)) {
        colorMap.get(colorKey)!.count++;
      } else {
        colorMap.set(colorKey, {
          color: this.rgbToHex(r, g, b),
          count: 1,
          hue: h,
          saturation: s,
          lightness: l,
          r, g, b
        });
      }
    }

    // Converte o Map para array e filtra/ordena por importância
    const processedPixels = Array.from(colorMap.values())
      .filter(pixel => pixel.count > (totalPixels * 0.001))
      .sort((a, b) => this.getColorImportance(b) - this.getColorImportance(a));

    // Segundo passo: Agrupamento mais preciso
    const groupedColors: PixelInfo[] = [];
    for (const pixel of processedPixels) {
      let foundGroup = false;
      for (const group of groupedColors) {
        if (this.colorDistance(pixel, group) < this.SIMILARITY_THRESHOLD) {
          group.count += pixel.count;
          
          // Se a cor atual for mais saturada, ela tem prioridade
          if (pixel.saturation > group.saturation * 1.1) {
            group.r = pixel.r;
            group.g = pixel.g;
            group.b = pixel.b;
            group.hue = pixel.hue;
            group.saturation = pixel.saturation;
            group.lightness = pixel.lightness;
            group.color = pixel.color;
          }
          
          foundGroup = true;
          break;
        }
      }

      if (!foundGroup && groupedColors.length < this.maxColors) {
        groupedColors.push({ ...pixel });
      }
    }

    // Seleciona as cores mais importantes
    let selectedColors = groupedColors
      .sort((a, b) => this.getColorImportance(b) - this.getColorImportance(a))
      .slice(0, this.maxColors);

    // Garante número exato de cores
    while (selectedColors.length < this.maxColors && processedPixels.length > 0) {
      const nextColor = processedPixels.find(pixel => 
        !selectedColors.some(selected => 
          this.colorDistance(pixel, selected) < this.SIMILARITY_THRESHOLD
        )
      );
      
      if (nextColor) {
        selectedColors.push(nextColor);
      } else {
        break;
      }
    }

    // Ordena por luminosidade
    selectedColors.sort((a, b) => a.lightness - b.lightness);

    // Distribui as alturas igualmente
    const heightStep = 100 / selectedColors.length;
    
    // Cria as camadas com alturas distribuídas igualmente
    const layers: LayerConfig[] = selectedColors.map((color, index) => ({
      color: color.color,
      heightPercentage: Math.min(100, (index + 1) * heightStep),
      td: 1.5
    }));

    console.log('Cores extraídas:', layers.map(l => l.color));
    return layers;
  }
}

export const dominantColorsPattern = new DominantColorsPattern(); 