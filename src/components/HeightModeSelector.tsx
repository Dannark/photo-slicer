import React from 'react';
import { HeightMode } from '../patterns/types/types';
import styles from './HeightModeSelector.module.css';

interface HeightModeSelectorProps {
  currentMode: HeightMode;
  onModeChange: (mode: HeightMode) => void;
}

export const HeightModeSelector: React.FC<HeightModeSelectorProps> = ({
  currentMode,
  onModeChange
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMode = e.target.value as HeightMode;
    console.log('HeightModeSelector - mudando para:', newMode);
    onModeChange(newMode);
  };

  return (
    <div className={styles.container}>
      <label htmlFor="heightMode" className={styles.label}>Height Mode:</label>
      <select
        id="heightMode"
        value={currentMode}
        onChange={handleChange}
        className={styles.select}
      >
        <option value={HeightMode.LUMINANCE}>Luminance</option>
        <option value={HeightMode.COLOR_MAPPING}>Color Mapping</option>
      </select>
    </div>
  );
};
