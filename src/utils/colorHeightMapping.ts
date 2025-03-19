import { LayerConfig } from '../patterns/types/types';

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

function colorDistance(color1: [number, number, number], color2: [number, number, number]): number {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) +
    Math.pow(color1[1] - color2[1], 2) +
    Math.pow(color1[2] - color2[2], 2)
  );
}

// Calcula a cor intermediária baseada no TD (transmissivity)
function interpolateColors(color1: LayerConfig, color2: LayerConfig, ratio: number): [number, number, number] {
  const rgb1 = hexToRgb(color1.color);
  const rgb2 = hexToRgb(color2.color);
  
  // Ajusta o ratio baseado no TD das cores
  const td1 = color1.td;
  const td2 = color2.td;
  const tdRatio = td1 / (td1 + td2);
  const adjustedRatio = ratio * tdRatio;

  return [
    Math.round(rgb1[0] * (1 - adjustedRatio) + rgb2[0] * adjustedRatio),
    Math.round(rgb1[1] * (1 - adjustedRatio) + rgb2[1] * adjustedRatio),
    Math.round(rgb1[2] * (1 - adjustedRatio) + rgb2[2] * adjustedRatio)
  ];
}

// Gera todas as cores possíveis incluindo as intermediárias
function generateColorPalette(layers: LayerConfig[]): Array<{ color: [number, number, number], height: number }> {
  const palette: Array<{ color: [number, number, number], height: number }> = [];
  
  // Adiciona as cores originais
  layers.forEach(layer => {
    palette.push({
      color: hexToRgb(layer.color),
      height: layer.heightPercentage
    });
  });

  // Adiciona cores intermediárias
  for (let i = 0; i < layers.length - 1; i++) {
    const steps = 5; // Número de cores intermediárias
    for (let step = 1; step < steps; step++) {
      const ratio = step / steps;
      const interpolatedColor = interpolateColors(layers[i], layers[i + 1], ratio);
      const interpolatedHeight = layers[i].heightPercentage + 
        (layers[i + 1].heightPercentage - layers[i].heightPercentage) * ratio;
      
      palette.push({
        color: interpolatedColor,
        height: interpolatedHeight
      });
    }
  }

  return palette;
}

export function calculateColorBasedHeight(
  pixelColor: [number, number, number],
  layers: LayerConfig[]
): number {
  const palette = generateColorPalette(layers);
  
  // Encontra a cor mais próxima na paleta
  let minDistance = Infinity;
  let closestHeight = 0;

  palette.forEach(({ color, height }) => {
    const distance = colorDistance(pixelColor, color);
    if (distance < minDistance) {
      minDistance = distance;
      closestHeight = height;
    }
  });

  return closestHeight;
}
