import React, { useState } from 'react';
import { patterns } from '../patterns';
import { LayerConfig } from '../patterns/types/types';
import { DominantColorsPattern } from '../patterns/algorithms/dominantColors';
import styles from './PatternSelector.module.css';

interface PatternSelectorProps {
  onSelectPattern: (layers: LayerConfig[]) => void;
  imageData?: ImageData;
  maxHeight?: number;
}

export const PatternSelector: React.FC<PatternSelectorProps> = ({ 
  onSelectPattern,
  imageData,
  maxHeight = 100
}) => {
  const [selectedPatternIndex, setSelectedPatternIndex] = useState(0);
  const [numColors, setNumColors] = useState(5);

  const handlePatternChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const index = parseInt(event.target.value);
    setSelectedPatternIndex(index);
    
    if (imageData) {
      let pattern = patterns[index];
      if (pattern instanceof DominantColorsPattern) {
        pattern = new DominantColorsPattern(numColors);
      }
      const layers = await pattern.execute(imageData, maxHeight);
      onSelectPattern(layers);
    }
  };

  const handleNumColorsChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Math.max(2, parseInt(event.target.value) || 2), 8);
    setNumColors(value);
    
    if (imageData && selectedPatternIndex === 3) {
      const pattern = new DominantColorsPattern(value);
      const layers = await pattern.execute(imageData, maxHeight);
      onSelectPattern(layers);
    }
  };

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
          <label htmlFor="numColors" className={styles.label}>Number of Colors:</label>
          <input
            type="number"
            id="numColors"
            min="2"
            max="8"
            value={numColors}
            onChange={handleNumColorsChange}
            className={styles.numberInput}
          />
        </div>
      )}
    </div>
  );
}; 