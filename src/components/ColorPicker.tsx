import React from 'react';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, onClose }) => {
  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-container" onClick={e => e.stopPropagation()}>
        <input
          type="color"
          onChange={(e) => onColorSelect(e.target.value)}
          className="color-picker-input"
        />
      </div>
    </div>
  );
};

export default ColorPicker; 