import React from 'react';
import { LayerConfig } from './HeightControls';

interface ExportInfoProps {
  firstLayerHeight: number;
  layerHeight: number;
  layers: LayerConfig[];
  baseHeight: number;
  onClose: () => void;
}

const ExportInfo: React.FC<ExportInfoProps> = ({ 
  firstLayerHeight, 
  layerHeight, 
  layers, 
  baseHeight,
  onClose 
}) => {
  // Calcula as camadas para cada cor
  const getLayerRanges = () => {
    const ranges: { color: string; start: number; end: number }[] = [];
    let previousEnd = 0;

    layers.forEach((layer, index) => {
      // Calcula a altura em milímetros até este percentual
      const heightInMm = (layer.heightPercentage / 100) * baseHeight;
      // Calcula quantas camadas são necessárias para atingir esta altura
      const totalLayers = Math.floor(heightInMm / layerHeight);
      
      if (index === 0) {
        // Para a primeira cor, começamos da camada 1
        ranges.push({
          color: layer.color,
          start: 1,
          end: totalLayers
        });
      } else {
        // Para as demais cores, começamos da próxima camada após a última cor
        const previousRange = ranges[index - 1];
        ranges.push({
          color: layer.color,
          start: previousRange.end + 1,
          end: totalLayers
        });
      }
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