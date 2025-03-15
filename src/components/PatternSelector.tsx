import React from 'react';
import { LayerConfig } from './HeightControls';

interface PatternSelectorProps {
  onSelectPattern: (layers: LayerConfig[]) => void;
  imageData?: ImageData;
}

const PatternSelector: React.FC<PatternSelectorProps> = ({ onSelectPattern, imageData }) => {
  const handlePatternChange = async (pattern: string) => {
    let newPattern: LayerConfig[] = [];

    if (pattern === 'grayscale-fixed') {
      newPattern = [
        { color: '#000000', heightPercentage: 10 },   // Preto
        { color: '#666666', heightPercentage: 33 },  // Cinza escuro
        { color: '#CCCCCC', heightPercentage: 66 },  // Cinza claro
        { color: '#FFFFFF', heightPercentage: 100 }  // Branco
      ];
    } else if (pattern === 'grayscale-distributed') {
      newPattern = [
        { color: '#000000', heightPercentage: 25 },
        { color: '#404040', heightPercentage: 50 },
        { color: '#808080', heightPercentage: 75 },
        { color: '#ffffff', heightPercentage: 100 }
      ];
    } else if (pattern === 'auto') {
      if (imageData && imageData.data.length > 0) {
        newPattern = posterizeImage(imageData);
      } else {
        newPattern = [
          { color: '#000000', heightPercentage: 20 },
          { color: '#404040', heightPercentage: 40 },
          { color: '#808080', heightPercentage: 60 },
          { color: '#C0C0C0', heightPercentage: 80 },
          { color: '#FFFFFF', heightPercentage: 100 }
        ];
      }
    }

    onSelectPattern(newPattern);
  };

  const posterizeImage = (imageData: ImageData): LayerConfig[] => {
    // Número de níveis desejados
    const numLevels = 5;
    
    // Array para armazenar as cores e suas luminâncias
    type PixelInfo = { r: number; g: number; b: number; luminance: number; count: number };
    const levels: PixelInfo[] = Array(numLevels).fill(null).map(() => ({ r: 0, g: 0, b: 0, luminance: 0, count: 0 }));
    
    // Calcula a luminância de cada pixel e agrupa nos níveis
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      // Calcula a luminância
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Determina o nível baseado na luminância
      const levelIndex = Math.min(Math.floor((luminance / 255) * numLevels), numLevels - 1);
      
      // Acumula as cores para fazer a média depois
      levels[levelIndex].r += r;
      levels[levelIndex].g += g;
      levels[levelIndex].b += b;
      levels[levelIndex].luminance += luminance;
      levels[levelIndex].count++;
    }
    
    // Calcula a média das cores para cada nível
    const pattern: LayerConfig[] = levels.map((level, index) => {
      if (level.count === 0) {
        // Se não houver pixels neste nível, use um valor interpolado
        const gray = Math.round((index / (numLevels - 1)) * 255);
        return {
          color: `#${gray.toString(16).padStart(2, '0').repeat(3)}`,
          heightPercentage: ((index + 1) * 100) / numLevels
        };
      }
      
      // Calcula a média das cores
      const r = Math.round(level.r / level.count);
      const g = Math.round(level.g / level.count);
      const b = Math.round(level.b / level.count);
      
      // Converte para hexadecimal
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      return {
        color,
        heightPercentage: ((index + 1) * 100) / numLevels
      };
    });
    
    // Ordena o padrão pela luminância (do mais escuro para o mais claro)
    pattern.sort((a, b) => {
      const getLuminance = (hex: string) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };
      
      return getLuminance(a.color) - getLuminance(b.color);
    });
    
    // Ajusta as porcentagens após a ordenação
    pattern.forEach((layer, index) => {
      layer.heightPercentage = ((index + 1) * 100) / numLevels;
    });

    return pattern;
  };

  return (
    <div className="pattern-selector">
      <select 
        onChange={(e) => handlePatternChange(e.target.value)}
        className="pattern-select"
      >
        <option value="grayscale-fixed">Grayscale (Default)</option>
        <option value="grayscale-distributed">Grayscale (Distributed)</option>
        <option value="auto">Posterized</option>
      </select>
    </div>
  );
};

export default PatternSelector; 