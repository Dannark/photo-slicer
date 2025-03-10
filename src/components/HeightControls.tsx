import React from 'react';

export interface LayerConfig {
  color: string;
  heightPercentage: number;
}

interface HeightControlsProps {
  baseHeight: number;
  onBaseHeightChange: (height: number) => void;
  layers: LayerConfig[];
  onLayersChange: (layers: LayerConfig[]) => void;
}

const DEFAULT_LAYER_HEIGHT = 0.08; // mm por camada

const HeightControls: React.FC<HeightControlsProps> = ({
  baseHeight,
  onBaseHeightChange,
  layers,
  onLayersChange,
}) => {
  const totalLayers = Math.floor(baseHeight / DEFAULT_LAYER_HEIGHT);

  const handleLayerColorChange = (index: number, color: string) => {
    const newLayers = [...layers];
    newLayers[index] = { ...newLayers[index], color };
    onLayersChange(newLayers);
  };

  const handleLayerHeightChange = (index: number, layerNumber: number) => {
    const newLayers = [...layers];
    const heightPercentage = (layerNumber / totalLayers) * 100;
    newLayers[index] = { ...newLayers[index], heightPercentage };
    onLayersChange(newLayers);
  };

  const getLayerNumber = (heightPercentage: number): number => {
    return Math.round((heightPercentage / 100) * totalLayers);
  };

  return (
    <div className="height-controls">
      <div className="base-height-control">
        <label>Altura Total (mm):</label>
        <input
          type="number"
          min="0.08"
          step="0.08"
          value={baseHeight}
          onChange={(e) => onBaseHeightChange(Number(e.target.value))}
        />
        <span>Total de Camadas: {totalLayers}</span>
      </div>
      
      <div className="layers-control">
        <h3>Configuração das Camadas</h3>
        {layers.map((layer, index) => {
          const currentLayer = getLayerNumber(layer.heightPercentage);
          return (
            <div key={index} className="layer-control">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => handleLayerColorChange(index, e.target.value)}
              />
              <div className="layer-slider-container">
                <input
                  type="range"
                  min="0"
                  max={totalLayers}
                  value={currentLayer}
                  onChange={(e) => handleLayerHeightChange(index, Number(e.target.value))}
                />
                <span>Camada {currentLayer} de {totalLayers}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HeightControls; 