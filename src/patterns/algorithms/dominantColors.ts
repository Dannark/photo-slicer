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
  private MAX_COLORS = 15;
  private QUANTIZE_LEVELS: number;
  private SIMILARITY_THRESHOLD: number;
  private RGB_WEIGHT: number;
  private HSL_WEIGHT: number;
  private HUE_WEIGHT: number;
  private SATURATION_WEIGHT: number;
  private LIGHTNESS_WEIGHT: number;

  constructor(
    private maxColors: number = 5,
    options: {
      similarityThreshold?: number;
      quantizeLevels?: number;
      rgbWeight?: number;
      hslWeight?: number;
      hueWeight?: number;
      saturationWeight?: number;
      lightnessWeight?: number;
    } = {}
  ) {
    this.maxColors = Math.min(Math.max(2, maxColors), this.MAX_COLORS);
    this.SIMILARITY_THRESHOLD = options.similarityThreshold ?? 0.15;
    this.QUANTIZE_LEVELS = options.quantizeLevels ?? 64;
    this.RGB_WEIGHT = options.rgbWeight ?? 0.3;
    this.HSL_WEIGHT = options.hslWeight ?? 0.7;
    this.HUE_WEIGHT = options.hueWeight ?? 15;
    this.SATURATION_WEIGHT = options.saturationWeight ?? 5;
    this.LIGHTNESS_WEIGHT = options.lightnessWeight ?? 4;
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
    // Calcula distância no espaço RGB
    const rDiff = (color1.r - color2.r) / 255;
    const gDiff = (color1.g - color2.g) / 255;
    const bDiff = (color1.b - color2.b) / 255;
    const rgbDistance = Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);

    // Calcula distância no espaço HSL
    const hueDiff = Math.min(Math.abs(color1.hue - color2.hue), 1 - Math.abs(color1.hue - color2.hue));
    const satDiff = Math.abs(color1.saturation - color2.saturation);
    const lightDiff = Math.abs(color1.lightness - color2.lightness);

    // Aumenta significativamente o peso para diferenças de matiz
    const saturationWeight = Math.max(color1.saturation, color2.saturation);
    const hslDistance = Math.sqrt(
      (hueDiff * hueDiff * this.HUE_WEIGHT * saturationWeight) +
      (satDiff * satDiff * this.SATURATION_WEIGHT) +
      (lightDiff * lightDiff * this.LIGHTNESS_WEIGHT)
    );

    return rgbDistance * this.RGB_WEIGHT + hslDistance * this.HSL_WEIGHT;
  }

  private getColorImportance(pixel: PixelInfo): number {
    // Aumenta significativamente o peso da frequência
    const frequencyImportance = Math.pow(Math.log10(pixel.count + 1), 2) * 5;
    
    // Considera saturação, mas com menos peso
    const saturationImportance = Math.pow(pixel.saturation, 2) * 2;
    
    // Penaliza cores muito claras ou muito escuras, mas menos que antes
    const lightnessPenalty = Math.pow(Math.abs(pixel.lightness - 0.5), 2);
    
    // Bônus para cores únicas baseado no matiz
    const hueDiversity = 1 + Math.sin(pixel.hue * Math.PI * 2) * 0.3;
    
    return (frequencyImportance + saturationImportance) * hueDiversity - lightnessPenalty;
  }

  private mergeSimilarColors(colors: PixelInfo[]): PixelInfo[] {
    const mergedColors: PixelInfo[] = [];
    const processedIndices = new Set<number>();

    for (let i = 0; i < colors.length; i++) {
      if (processedIndices.has(i)) continue;
      
      let currentColor = colors[i];
      let similarColors: PixelInfo[] = [currentColor];
      
      // Procura cores similares
      for (let j = i + 1; j < colors.length; j++) {
        if (processedIndices.has(j)) continue;
        
        const distance = this.colorDistance(currentColor, colors[j]);
        if (distance < this.SIMILARITY_THRESHOLD) {
          similarColors.push(colors[j]);
          processedIndices.add(j);
        }
      }
      
      if (similarColors.length > 1) {
        // Combina as cores similares em uma média ponderada
        const totalCount = similarColors.reduce((sum, c) => sum + c.count, 0);
        const weightedR = similarColors.reduce((sum, c) => sum + c.r * c.count, 0) / totalCount;
        const weightedG = similarColors.reduce((sum, c) => sum + c.g * c.count, 0) / totalCount;
        const weightedB = similarColors.reduce((sum, c) => sum + c.b * c.count, 0) / totalCount;
        
        const [h, s, l] = rgbToHsl(weightedR, weightedG, weightedB);
        
        currentColor = {
          color: this.rgbToHex(weightedR, weightedG, weightedB),
          count: totalCount,
          hue: h,
          saturation: s,
          lightness: l,
          r: weightedR,
          g: weightedG,
          b: weightedB
        };
      }
      
      mergedColors.push(currentColor);
      processedIndices.add(i);
    }

    return mergedColors;
  }

  private generateLayersFromColors(baseColors: PixelInfo[], maxLayers: number = 25): LayerConfig[] {
    const layers: LayerConfig[] = [];
    const heightStep = 100 / maxLayers;
    let currentHeight = 0;

    // Função auxiliar para adicionar uma camada
    const addLayer = (color: string, td: number = 1.5) => {
      // Não adiciona se for a mesma cor que a última camada
      if (layers.length > 0 && layers[layers.length - 1].color === color) {
        return;
      }
      
      currentHeight += heightStep;
      layers.push({
        color,
        heightPercentage: currentHeight,
        td
      });
    };

    // Ordena as cores por luminosidade
    const sortedColors = [...baseColors].sort((a, b) => a.lightness - b.lightness);
    
    // Adiciona a cor mais escura como base
    addLayer(sortedColors[0].color);

    // Para cada cor, adiciona uma camada com TD baseado na diferença de luminosidade
    for (let i = 0; i < sortedColors.length - 1; i++) {
      const currentColor = sortedColors[i];
      const nextColor = sortedColors[i + 1];
      
      // Calcula TD baseado na diferença de luminosidade e saturação
      const luminosityDiff = nextColor.lightness - currentColor.lightness;
      const saturationDiff = Math.abs(nextColor.saturation - currentColor.saturation);
      const baseTD = 1.5 + (luminosityDiff * 0.5) + (saturationDiff * 0.3);

      // Adiciona a cor atual com TD ajustado
      addLayer(currentColor.color, baseTD);
      
      // Se houver uma diferença significativa, adiciona uma transição
      if (luminosityDiff > 0.1 || saturationDiff > 0.2) {
        addLayer(nextColor.color, Math.min(baseTD * 0.8, 1.2));
      }
    }

    // Adiciona a cor mais clara no final
    addLayer(sortedColors[sortedColors.length - 1].color, 1.0);

    // Normaliza as alturas para garantir que chegue a 100%
    const maxHeight = layers[layers.length - 1].heightPercentage;
    layers.forEach(layer => {
      layer.heightPercentage = (layer.heightPercentage / maxHeight) * 100;
    });

    console.log('Camadas geradas:', layers.map(l => ({
      color: l.color,
      height: l.heightPercentage,
      td: l.td
    })));

    return layers;
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

    // Filtra cores muito raras e ordena por importância
    let processedPixels = Array.from(colorMap.values())
      .filter(pixel => pixel.count > (totalPixels * 0.001))
      .sort((a, b) => this.getColorImportance(b) - this.getColorImportance(a));

    // Merge cores similares para reduzir redundância
    processedPixels = this.mergeSimilarColors(processedPixels);

    // Encontra cores extremas
    const darkestColor = processedPixels.reduce((min, current) => 
      current.lightness < min.lightness ? current : min
    );
    const lightestColor = processedPixels.reduce((max, current) => 
      current.lightness > max.lightness ? current : max
    );

    // Seleciona cores dominantes
    let selectedColors: PixelInfo[] = [darkestColor];
    let remainingColors = processedPixels.filter(color => 
      color !== darkestColor && 
      color !== lightestColor &&
      color.saturation > 0.1 // Reduzido o limite de saturação
    );

    // Seleciona cores mais importantes mantendo diversidade
    while (selectedColors.length < this.maxColors - 1 && remainingColors.length > 0) {
      let bestColor: PixelInfo | null = null;
      let maxScore = -1;

      for (const candidate of remainingColors) {
        // Calcula distância mínima para cores já selecionadas
        const minDistance = Math.min(
          ...selectedColors.map(selected => this.colorDistance(candidate, selected))
        );

        // Score baseado na importância e distância das cores existentes
        // Aumenta o peso da distância para favorecer cores mais distintas
        const score = this.getColorImportance(candidate) * Math.pow(minDistance, 1.5);

        if (score > maxScore) {
          maxScore = score;
          bestColor = candidate;
        }
      }

      if (bestColor) {
        selectedColors.push(bestColor);
        remainingColors = remainingColors.filter(color => 
          this.colorDistance(color, bestColor!) >= this.SIMILARITY_THRESHOLD
        );
      } else {
        break;
      }
    }

    // Adiciona a cor mais clara por último se for significativamente diferente
    if (this.colorDistance(lightestColor, selectedColors[selectedColors.length - 1]) >= this.SIMILARITY_THRESHOLD) {
      selectedColors.push(lightestColor);
    }

    console.log('Cores selecionadas:', selectedColors.map(c => ({
      color: c.color,
      count: c.count,
      percentage: (c.count / totalPixels * 100).toFixed(2) + '%'
    })));

    return this.generateLayersFromColors(selectedColors, 25);
  }
}

export const dominantColorsPattern = new DominantColorsPattern(); 