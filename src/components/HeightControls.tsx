import React from 'react';

export interface LayerConfig {
  color: string;
  heightPercentage: number;
}

interface HeightControlsProps {
  numLayers: number;
  onNumLayersChange: (layers: number) => void;
  baseThickness: number;
  onBaseThicknessChange: (thickness: number) => void;
  layerHeight: number;
  onLayerHeightChange: (height: number) => void;
  resolution: number;
  onResolutionChange: (resolution: number) => void;
}

const HeightControls: React.FC<HeightControlsProps> = ({
  numLayers,
  onNumLayersChange,
  baseThickness,
  onBaseThicknessChange,
  layerHeight,
  onLayerHeightChange,
  resolution,
  onResolutionChange,
}) => {
  // Função para arredondar para 2 casas decimais
  const roundToTwoDecimals = (num: number) => {
    return Math.round(num * 100) / 100;
  };

  // Primeira camada é sempre o dobro da altura da camada normal
  const firstLayerHeight = roundToTwoDecimals(layerHeight * 2);
  
  // Base layers (número de camadas após a primeira camada)
  const baseLayers = Math.floor(baseThickness / layerHeight);
  
  // Calcula o número total de camadas e altura total
  const totalLayers = numLayers + baseLayers + 1; // +1 para a primeira camada
  const totalHeight = roundToTwoDecimals((numLayers - 1) * layerHeight + firstLayerHeight + (baseLayers * layerHeight));

  const handleBaseLayersChange = (numBaseLayers: number) => {
    // Garante que o número de camadas base seja não-negativo
    const newBaseLayers = Math.max(0, numBaseLayers);
    // Converte o número de camadas para espessura
    const newBaseThickness = roundToTwoDecimals(newBaseLayers * layerHeight);
    onBaseThicknessChange(newBaseThickness);
  };

  const handleLayerHeightChange = (value: number) => {
    // Garante um valor mínimo para a altura da camada
    const newLayerHeight = roundToTwoDecimals(Math.max(0.04, value));
    onLayerHeightChange(newLayerHeight);
    
    // Ajusta a espessura da base para manter o número de camadas
    const newBaseThickness = roundToTwoDecimals(baseLayers * newLayerHeight);
    onBaseThicknessChange(newBaseThickness);
  };

  const handleNumLayersChange = (value: number) => {
    // Garante um valor mínimo de 1 camada
    const newNumLayers = Math.max(1, value);
    onNumLayersChange(newNumLayers);
  };

  return (
    <div className="height-controls">
      <div className="controls-group">
        <div className="control-item">
          <label>Layer Height (mm):</label>
          <input
            type="number"
            min="0.04"
            step="0.04"
            value={layerHeight}
            onChange={(e) => handleLayerHeightChange(Number(e.target.value))}
          />
          <span>Minimum height: 0.04mm</span>
        </div>

        <div className="control-item">
          <label>First Layer (mm):</label>
          <input
            type="number"
            value={firstLayerHeight}
            disabled
            className="disabled-input"
          />
          <span>Always 2x layer height</span>
        </div>

        <div className="control-item">
          <label>Base Layers:</label>
          <input
            type="number"
            min="0"
            step="1"
            value={baseLayers}
            onChange={(e) => handleBaseLayersChange(Number(e.target.value))}
          />
          <span>Height: {roundToTwoDecimals(baseLayers * layerHeight)}mm</span>
        </div>

        <div className="control-item">
          <label>Number of Layers:</label>
          <input
            type="number"
            min="1"
            step="1"
            value={numLayers}
            onChange={(e) => handleNumLayersChange(Number(e.target.value))}
          />
          <span>Total Height: {totalHeight}mm</span>
        </div>
      </div>
      
      <div className="controls-group">
        <div className="control-item">
          <label>Mesh Resolution:</label>
          <div className="resolution-slider-container">
            <input
              type="range"
              min="50"
              max="800"
              step="10"
              value={resolution}
              onChange={(e) => onResolutionChange(Number(e.target.value))}
            />
            <span>{resolution} vertices</span>
          </div>
          <span>Higher values mean more detail (50-800)</span>
        </div>
      </div>
    </div>
  );
};

export default HeightControls; 