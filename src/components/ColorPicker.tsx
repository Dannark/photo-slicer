import React, { useState } from 'react';

interface ColorPickerProps {
  onColorSelect: (color: string) => void;
  onClose: () => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ onColorSelect, onClose }) => {
  const [selectedColor, setSelectedColor] = useState('#000000');

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedColor(e.target.value);
  };

  const handleConfirm = () => {
    onColorSelect(selectedColor);
  };

  return (
    <div className="color-picker-overlay" onClick={onClose}>
      <div className="color-picker-container" onClick={e => e.stopPropagation()}>
        <input
          type="color"
          value={selectedColor}
          onChange={handleColorChange}
          className="color-picker-input"
        />
        <div className="color-picker-buttons">
          <button onClick={handleConfirm} className="color-picker-confirm">
            Confirmar
          </button>
          <button onClick={onClose} className="color-picker-cancel">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColorPicker; 