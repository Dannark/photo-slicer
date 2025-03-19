import React from 'react';
import { HeightMode, HeightModeConfig } from '../patterns/types/types';
import styles from './HeightModeSelector.module.css';

interface HeightModeSelectorProps {
  currentMode: HeightMode;
  onModeChange: (config: HeightModeConfig) => void;
}

export const HeightModeSelector: React.FC<HeightModeSelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = event.target.value as HeightMode;
    onModeChange({ mode: newMode });
  };

  return (
    <div className={styles.container}>
      <label htmlFor="heightMode" className={styles.label}>Height Mode:</label>
      <select
        id="heightMode"
        value={currentMode}
        onChange={handleModeChange}
        className={styles.select}
      >
        <option value={HeightMode.LUMINANCE}>Luminance (Default)</option>
        <option value={HeightMode.COLOR_MAPPING}>Color Mapping</option>
      </select>
    </div>
  );
};
