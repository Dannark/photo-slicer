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
  layerHeight: number;
  onLayerHeightChange: (height: number) => void;
  layers: LayerConfig[];
  onLayersChange: (layers: LayerConfig[]) => void;
}

const HeightControls: React.FC<HeightControlsProps> = ({
  baseHeight,
  onBaseHeightChange,
  baseThickness,
  onBaseThicknessChange,
  layerHeight,
  onLayerHeightChange,
  layers,
  onLayersChange,
}) => {
  // Calcula o número total de camadas incluindo a base
  const totalLayers = Math.floor((baseHeight + baseThickness) / layerHeight);
  const baseLayerCount = Math.floor(baseThickness / layerHeight);

  const handleBaseThicknessChange = (value: number) => {
    // Garante que a espessura da base seja múltiplo da altura da camada
    const normalizedThickness = Math.round(value / layerHeight) * layerHeight;
    onBaseThicknessChange(normalizedThickness);
  };

  const handleLayerHeightChange = (value: number) => {
    // Garante um valor mínimo para a altura da camada
    const newLayerHeight = Math.max(0.04, value);
    onLayerHeightChange(newLayerHeight);
    
    // Ajusta a espessura da base para ser múltiplo da nova altura da camada
    const newBaseThickness = Math.round(baseThickness / newLayerHeight) * newLayerHeight;
    onBaseThicknessChange(newBaseThickness);
  };

  return (
    <div className="height-controls">
      <div className="controls-group">
        <div className="control-item">
          <label>Altura da Camada (mm):</label>
          <input
            type="number"
            min="0.04"
            step="0.04"
            value={layerHeight}
            onChange={(e) => handleLayerHeightChange(Number(e.target.value))}
          />
          <span>Altura mínima: 0.04mm</span>
        </div>

        <div className="control-item">
          <label>Espessura da Base (mm):</label>
          <input
            type="number"
            min={layerHeight}
            step={layerHeight}
            value={baseThickness}
            onChange={(e) => handleBaseThicknessChange(Number(e.target.value))}
          />
          <span>Camadas da Base: {baseLayerCount}</span>
        </div>

        <div className="control-item">
          <label>Altura Total (mm):</label>
          <input
            type="number"
            min={layerHeight}
            step={layerHeight}
            value={baseHeight}
            onChange={(e) => onBaseHeightChange(Number(e.target.value))}
          />
          <span>Total de Camadas: {totalLayers}</span>
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