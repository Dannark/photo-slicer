import React, { useState, useEffect, useMemo } from 'react';
import { patterns } from '../patterns';
import { LayerConfig, HeightMode } from '../patterns/types/types';
import { DominantColorsPattern } from '../patterns/algorithms/dominantColors';
import styles from './PatternSelector.module.css';

interface PatternSelectorProps {
  onSelectPattern: (layers: LayerConfig[]) => void;
  imageData?: ImageData;
  maxHeight?: number;
  onHeightModeChange?: (mode: HeightMode) => void;
}

// Função auxiliar para redimensionar ImageData
const resizeImageData = (imageData: ImageData, maxDimension: number = 800): ImageData => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Calcula as novas dimensões mantendo a proporção
  const ratio = Math.min(maxDimension / imageData.width, maxDimension / imageData.height);
  const newWidth = Math.round(imageData.width * ratio);
  const newHeight = Math.round(imageData.height * ratio);

  // Cria um canvas temporário com a imagem original
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Could not get temporary canvas context');
  
  tempCanvas.width = imageData.width;
  tempCanvas.height = imageData.height;
  tempCtx.putImageData(imageData, 0, 0);

  // Redimensiona para o novo canvas
  canvas.width = newWidth;
  canvas.height = newHeight;
  ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);

  return ctx.getImageData(0, 0, newWidth, newHeight);
};

export const PatternSelector: React.FC<PatternSelectorProps> = ({ 
  onSelectPattern,
  imageData,
  maxHeight = 100,
  onHeightModeChange
}) => {
  const [selectedPatternIndex, setSelectedPatternIndex] = useState(0);
  const [numColors, setNumColors] = useState(5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.15);
  const [quantizeLevels, setQuantizeLevels] = useState(64);
  const [rgbWeight, setRgbWeight] = useState(0.3);
  const [hslWeight, setHslWeight] = useState(0.7);
  const [hueWeight, setHueWeight] = useState(15);
  const [saturationWeight, setSaturationWeight] = useState(5);
  const [lightnessWeight, setLightnessWeight] = useState(4);
  const [isAdjusting, setIsAdjusting] = useState(false);

  // Cria uma versão redimensionada da imagem para análise de cores
  const resizedImageData = useMemo(() => {
    if (!imageData) return null;
    if (imageData.width <= 800 && imageData.height <= 800) return imageData;
    return resizeImageData(imageData);
  }, [imageData]);

  const handlePatternChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(event.target.value);
    setSelectedPatternIndex(index);
    
    if (imageData) {
      let pattern = patterns[index];
      if (pattern instanceof DominantColorsPattern) {
        pattern = new DominantColorsPattern(numColors, {
          similarityThreshold,
          quantizeLevels,
          rgbWeight,
          hslWeight,
          hueWeight,
          saturationWeight,
          lightnessWeight
        });
      }
      const layers = await pattern.execute(imageData, maxHeight);
      onSelectPattern(layers);  
    }

    if(onHeightModeChange){
      if (index <= 2) {
        onHeightModeChange(HeightMode.LUMINANCE);
      }
      else if (index === 3 && onHeightModeChange) {
        onHeightModeChange(HeightMode.COLOR_MAPPING);
      }
    }
  };

  const handleNumColorsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(2, parseInt(event.target.value) || 2), 15);
    setNumColors(value);
    
    if (imageData && selectedPatternIndex === 3) {
      const pattern = new DominantColorsPattern(value, {
        similarityThreshold,
        quantizeLevels,
        rgbWeight,
        hslWeight,
        hueWeight,
        saturationWeight,
        lightnessWeight
      });
      // Usa a imagem redimensionada para preview
      const previewLayers = await pattern.execute(resizedImageData || imageData, maxHeight);
      onSelectPattern(previewLayers);
    }
  };

  const handleParameterChange = async (param: string, value: number) => {
    switch(param) {
      case 'similarityThreshold':
        setSimilarityThreshold(value);
        break;
      case 'quantizeLevels':
        setQuantizeLevels(value);
        break;
      case 'rgbWeight':
        setRgbWeight(value);
        setHslWeight(1 - value);
        break;
      case 'hslWeight':
        setHslWeight(value);
        setRgbWeight(1 - value);
        break;
      case 'hueWeight':
        setHueWeight(value);
        break;
      case 'saturationWeight':
        setSaturationWeight(value);
        break;
      case 'lightnessWeight':
        setLightnessWeight(value);
        break;
    }

    if (imageData && selectedPatternIndex === 3) {
      const pattern = new DominantColorsPattern(numColors, {
        similarityThreshold: param === 'similarityThreshold' ? value : similarityThreshold,
        quantizeLevels: param === 'quantizeLevels' ? value : quantizeLevels,
        rgbWeight: param === 'rgbWeight' ? value : rgbWeight,
        hslWeight: param === 'hslWeight' ? value : hslWeight,
        hueWeight: param === 'hueWeight' ? value : hueWeight,
        saturationWeight: param === 'saturationWeight' ? value : saturationWeight,
        lightnessWeight: param === 'lightnessWeight' ? value : lightnessWeight
      });
      // Usa a imagem redimensionada durante o ajuste
      const previewLayers = await pattern.execute(resizedImageData || imageData, maxHeight);
      onSelectPattern(previewLayers);
    }
  };

  // Função para aplicar as configurações na imagem original
  const applyToOriginalImage = async () => {
    if (!imageData || selectedPatternIndex !== 3) return;

    const pattern = new DominantColorsPattern(numColors, {
      similarityThreshold,
      quantizeLevels,
      rgbWeight,
      hslWeight,
      hueWeight,
      saturationWeight,
      lightnessWeight
    });
    const layers = await pattern.execute(imageData, maxHeight);
    onSelectPattern(layers);
  };

  // Aplica as configurações na imagem original quando o usuário para de ajustar
  useEffect(() => {
    if (!isAdjusting) {
      applyToOriginalImage();
    }
  }, [isAdjusting]);

  return (
    <div className={styles.container}>
      <select 
        onChange={handlePatternChange} 
        defaultValue="0"
        className={styles.patternSelect}
      >
        <option value="0">Grayscale (Default)</option>
        <option value="1">Grayscale (Distributed)</option>
        <option value="2">Posterized</option>
        <option value="3">Dominant Colors</option>
      </select>

      {selectedPatternIndex === 3 && (
        <div className={styles.colorsControl}>
          <div className={styles.controlGroup}>
            <label htmlFor="numColors" className={styles.label}>Número de Cores:</label>
            <input
              type="number"
              id="numColors"
              min="2"
              max="15"
              value={numColors}
              onChange={handleNumColorsChange}
              className={styles.numberInput}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="similarityThreshold" className={styles.label}>
              Limiar de Similaridade: {similarityThreshold.toFixed(2)}
            </label>
            <input
              type="range"
              id="similarityThreshold"
              min="0.05"
              max="0.3"
              step="0.01"
              value={similarityThreshold}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('similarityThreshold', parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="quantizeLevels" className={styles.label}>
              Níveis de Quantização: {quantizeLevels}
            </label>
            <input
              type="range"
              id="quantizeLevels"
              min="32"
              max="128"
              step="8"
              value={quantizeLevels}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('quantizeLevels', parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="rgbWeight" className={styles.label}>
              Peso RGB: {rgbWeight.toFixed(2)}
            </label>
            <input
              type="range"
              id="rgbWeight"
              min="0"
              max="1"
              step="0.1"
              value={rgbWeight}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('rgbWeight', parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="hueWeight" className={styles.label}>
              Peso do Matiz: {hueWeight}
            </label>
            <input
              type="range"
              id="hueWeight"
              min="5"
              max="25"
              step="1"
              value={hueWeight}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('hueWeight', parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="saturationWeight" className={styles.label}>
              Peso da Saturação: {saturationWeight}
            </label>
            <input
              type="range"
              id="saturationWeight"
              min="1"
              max="10"
              step="1"
              value={saturationWeight}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('saturationWeight', parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>

          <div className={styles.controlGroup}>
            <label htmlFor="lightnessWeight" className={styles.label}>
              Peso da Luminosidade: {lightnessWeight}
            </label>
            <input
              type="range"
              id="lightnessWeight"
              min="1"
              max="10"
              step="1"
              value={lightnessWeight}
              onMouseDown={() => setIsAdjusting(true)}
              onMouseUp={() => setIsAdjusting(false)}
              onTouchStart={() => setIsAdjusting(true)}
              onTouchEnd={() => setIsAdjusting(false)}
              onChange={(e) => handleParameterChange('lightnessWeight', parseInt(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>
      )}
    </div>
  );
}; 