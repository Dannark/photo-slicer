import React from 'react';
import { LayerConfig } from './HeightControls';

interface ExportInfoProps {
  firstLayerHeight: number;
  layerHeight: number;
  layers: LayerConfig[];
  baseHeight: number;
  baseThickness: number;
  onClose: () => void;
}

const ExportInfo: React.FC<ExportInfoProps> = ({ 
  firstLayerHeight, 
  layerHeight, 
  layers, 
  baseHeight,
  baseThickness,
  onClose 
}) => {
  // Calcula as camadas para cada cor
  const getLayerRanges = () => {
    const ranges: { color: string; start: number; end: number }[] = [];
    
    // Calcula o número total de camadas
    const firstLayerHeight = layerHeight * 2;
    const additionalBaseThickness = Math.max(0, baseThickness - firstLayerHeight);
    const additionalBaseLayers = Math.floor(additionalBaseThickness / layerHeight);
    const totalLayers = Math.floor(baseHeight / layerHeight) + additionalBaseLayers + 1; // +1 para a primeira camada

    let previousEnd = 0;
    layers.forEach((layer, index) => {
      // Calcula o número de camadas para esta cor
      const layerEndNumber = Math.floor((layer.heightPercentage / 100) * totalLayers);
      const start = previousEnd + 1;
      const end = layerEndNumber;
      
      ranges.push({
        color: layer.color,
        start: start,
        end: end
      });
      
      previousEnd = end;
    });

    return ranges;
  };

  const layerRanges = getLayerRanges();

  return (
    <div className="export-info-overlay">
      <div className="export-info-container">
        <h2>Informações de Fatiamento</h2>
        
        <div className="export-info-section">
          <h3>Configurações de Altura</h3>
          <p>Primeira camada: {firstLayerHeight.toFixed(2)}mm</p>
          <p>Demais camadas: {layerHeight.toFixed(2)}mm</p>
        </div>

        <div className="export-info-section">
          <h3>Sequência de Impressão</h3>
          <div className="color-sequence">
            {layerRanges.map((range, index) => (
              <div key={index} className="color-range">
                <div 
                  className="color-sample" 
                  style={{ backgroundColor: range.color }} 
                />
                <p>
                  {index === 0 
                    ? `Iniciar com ${range.color} (camadas ${range.start}-${range.end})`
                    : `Trocar para ${range.color} na camada ${range.start} (até ${range.end})`
                  }
                </p>
              </div>
            ))}
          </div>
        </div>

        <button className="export-info-close" onClick={onClose}>
          Fechar
        </button>
      </div>
    </div>
  );
};

export default ExportInfo; 