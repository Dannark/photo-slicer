import React from 'react';

export interface LayerConfig {
  color: string;
  heightPercentage: number;
}

interface HeightControlsProps {
  baseHeight: number;
  onBaseHeightChange: (height: number) => void;
  baseThickness: number;
  onBaseThicknessChange: (thickness: number) => void;
  layers: LayerConfig[];
  onLayersChange: (layers: LayerConfig[]) => void;
}

const DEFAULT_LAYER_HEIGHT = 0.08; // mm por camada
const DEFAULT_BASE_THICKNESS = 0.16; // 2 camadas de base por padrão

const HeightControls: React.FC<HeightControlsProps> = ({
  baseHeight,
  onBaseHeightChange,
  baseThickness,
  onBaseThicknessChange,
  layers,
  onLayersChange,
}) => {
  // Calcula o número total de camadas incluindo a base
  const totalLayers = Math.floor((baseHeight + baseThickness) / DEFAULT_LAYER_HEIGHT);
  const baseLayerCount = Math.floor(baseThickness / DEFAULT_LAYER_HEIGHT);

  const handleBaseThicknessChange = (value: number) => {
    // Garante que a espessura da base seja múltiplo da altura da camada
    const normalizedThickness = Math.round(value / DEFAULT_LAYER_HEIGHT) * DEFAULT_LAYER_HEIGHT;
    onBaseThicknessChange(normalizedThickness);
  };

  return (
    <div className="height-controls">
      <div className="controls-group">
        <div className="control-item">
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

        <div className="control-item">
          <label>Espessura da Base (mm):</label>
          <input
            type="number"
            min={DEFAULT_LAYER_HEIGHT}
            step={DEFAULT_LAYER_HEIGHT}
            value={baseThickness}
            onChange={(e) => handleBaseThicknessChange(Number(e.target.value))}
          />
          <span>Camadas da Base: {baseLayerCount}</span>
        </div>
      </div>
      
      <div className="layers-control">
        <h3>Configuração das Camadas</h3>
        {layers.map((layer, index) => {
          const currentLayer = Math.floor((layer.heightPercentage / 100) * (totalLayers - baseLayerCount));
          return (
            <div key={index} className="layer-control">
              <input
                type="color"
                value={layer.color}
                onChange={(e) => {
                  const newLayers = [...layers];
                  newLayers[index] = { ...newLayers[index], color: e.target.value };
                  onLayersChange(newLayers);
                }}
              />
              <div className="layer-slider-container">
                <input
                  type="range"
                  min="0"
                  max={totalLayers - baseLayerCount}
                  value={currentLayer}
                  onChange={(e) => {
                    const newLayers = [...layers];
                    const heightPercentage = (Number(e.target.value) / (totalLayers - baseLayerCount)) * 100;
                    newLayers[index] = { ...newLayers[index], heightPercentage };
                    onLayersChange(newLayers);
                  }}
                />
                <span>Camada {currentLayer} de {totalLayers - baseLayerCount}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default HeightControls; 