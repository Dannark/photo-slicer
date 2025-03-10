import React from 'react';
import { LayerConfig } from './HeightControls';

interface PatternSelectorProps {
  onSelectPattern: (layers: LayerConfig[]) => void;
  imageData?: ImageData;
}

const PatternSelector: React.FC<PatternSelectorProps> = ({ onSelectPattern, imageData }) => {
  const handlePatternChange = async (pattern: string) => {
    console.log('Pattern selecionado:', pattern);
    console.log('ImageData presente?', !!imageData);
    if (imageData) {
      console.log('Dimensões da imagem:', imageData.width, 'x', imageData.height);
      console.log('Tamanho dos dados:', imageData.data.length);
      console.log('Primeiros pixels:', imageData.data.slice(0, 12));
    }

    let newPattern: LayerConfig[] = [];

    if (pattern === 'grayscale-fixed') {
      // Padrão fixo: preto (3 camadas), cinza escuro (4 camadas), cinza claro (3 camadas), branco (resto)
      newPattern = [
        { color: '#000000', heightPercentage: 10 },
        { color: '#404040', heightPercentage: 33 },
        { color: '#808080', heightPercentage: 66 },
        { color: '#ffffff', heightPercentage: 100 }
      ];
      console.log('Padrão escala de cinza fixo gerado:', newPattern);
    } else if (pattern === 'grayscale-distributed') {
      // Padrão distribuído igualmente
      newPattern = [
        { color: '#000000', heightPercentage: 25 },
        { color: '#404040', heightPercentage: 50 },
        { color: '#808080', heightPercentage: 75 },
        { color: '#ffffff', heightPercentage: 100 }
      ];
      console.log('Padrão escala de cinza distribuído gerado:', newPattern);
    } else if (pattern === 'auto') {
      if (imageData && imageData.data.length > 0) {
        console.log('Extraindo cores dominantes da imagem...');
        const colors = extractDominantColors(imageData);
        console.log('Cores dominantes encontradas:', colors);
        newPattern = colors.map((color, index) => ({
          color,
          heightPercentage: ((index + 1) * 100) / colors.length
        }));
        console.log('Padrão colorido gerado:', newPattern);
      } else {
        console.log('Não tem imagem ou imageData inválido, usando cores padrão');
        newPattern = [
          { color: '#FF0000', heightPercentage: 25 }, // Vermelho
          { color: '#00FF00', heightPercentage: 50 }, // Verde
          { color: '#0000FF', heightPercentage: 75 }, // Azul
          { color: '#FFFF00', heightPercentage: 100 } // Amarelo
        ];
        console.log('Padrão colorido padrão gerado:', newPattern);
      }
    }

    console.log('Chamando onSelectPattern com o novo padrão:', newPattern);
    onSelectPattern(newPattern);
  };

  // Função para extrair as cores dominantes da imagem
  const extractDominantColors = (imageData: ImageData): string[] => {
    console.log('Iniciando extração de cores dominantes...');
    const colorMap = new Map<string, number>();
    
    // Analisa cada pixel da imagem
    for (let i = 0; i < imageData.data.length; i += 4) {
      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      
      // Reduz a precisão das cores para agrupar cores similares
      const rKey = Math.round(r/32);  // Reduz para 8 níveis (256/32)
      const gKey = Math.round(g/32);
      const bKey = Math.round(b/32);
      
      // Cria uma chave única para esta cor
      const colorKey = `${rKey},${gKey},${bKey}`;
      colorMap.set(colorKey, (colorMap.get(colorKey) || 0) + 1);
    }

    console.log(`Encontradas ${colorMap.size} cores únicas após agrupamento`);

    // Ordena as cores por frequência e pega as 4 mais comuns
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([color]) => {
        // Converte de volta para RGB
        const [r, g, b] = color.split(',').map(n => parseInt(n) * 32);
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        console.log(`Cor convertida: RGB(${r},${g},${b}) -> ${hex}`);
        return hex;
      });

    console.log('Cores dominantes extraídas:', sortedColors);
    return sortedColors;
  };

  return (
    <div className="pattern-selector">
      <select 
        onChange={(e) => handlePatternChange(e.target.value)}
        className="pattern-select"
      >
        <option value="grayscale-fixed">Escala de Cinza (Padrão)</option>
        <option value="grayscale-distributed">Escala de Cinza (Distribuída)</option>
        <option value="auto">Cores dominantes</option>
      </select>
    </div>
  );
};

export default PatternSelector; 