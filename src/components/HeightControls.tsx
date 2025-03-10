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
  resolution: number;
  onResolutionChange: (resolution: number) => void;
}

const HeightControls: React.FC<HeightControlsProps> = ({
  baseHeight,
  onBaseHeightChange,
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
  
  // Base adicional (além da primeira camada)
  const additionalBaseThickness = roundToTwoDecimals(Math.max(0, baseThickness - firstLayerHeight));
  
  // Calcula o número total de camadas
  const additionalBaseLayers = Math.floor(additionalBaseThickness / layerHeight);
  const totalLayers = Math.floor(baseHeight / layerHeight) + additionalBaseLayers + 1; // +1 para a primeira camada

  const handleBaseThicknessChange = (value: number) => {
    // Garante que a espessura total da base não seja menor que a primeira camada
    const minThickness = firstLayerHeight;
    const normalizedThickness = roundToTwoDecimals(Math.max(minThickness, Math.round((value - minThickness) / layerHeight) * layerHeight + minThickness));
    onBaseThicknessChange(normalizedThickness);
  };

  const handleLayerHeightChange = (value: number) => {
    // Garante um valor mínimo para a altura da camada
    const newLayerHeight = roundToTwoDecimals(Math.max(0.04, value));
    onLayerHeightChange(newLayerHeight);
    
    // Ajusta a espessura da base para manter o número de camadas adicionais
    const newFirstLayerHeight = roundToTwoDecimals(newLayerHeight * 2);
    const newBaseThickness = roundToTwoDecimals(newFirstLayerHeight + (additionalBaseLayers * newLayerHeight));
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
          <label>Primeira Camada (mm):</label>
          <input
            type="number"
            value={firstLayerHeight}
            disabled
            className="disabled-input"
          />
          <span>Sempre 2x a altura da camada</span>
        </div>

        <div className="control-item">
          <label>Base Adicional (mm):</label>
          <input
            type="number"
            min="0"
            step={layerHeight}
            value={additionalBaseThickness}
            onChange={(e) => handleBaseThicknessChange(e.target.value ? Number(e.target.value) + firstLayerHeight : firstLayerHeight)}
          />
          <span>Camadas adicionais: {additionalBaseLayers}</span>
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
      
      <div className="controls-group">
        <div className="control-item">
          <label>Resolução da Malha:</label>
          <div className="resolution-slider-container">
            <input
              type="range"
              min="50"
              max="800"
              step="10"
              value={resolution}
              onChange={(e) => onResolutionChange(Number(e.target.value))}
            />
            <span>{resolution} vértices</span>
          </div>
          <span>Quanto maior, mais detalhado (50-800)</span>
        </div>
      </div>
    </div>
  );
};

export default HeightControls; 