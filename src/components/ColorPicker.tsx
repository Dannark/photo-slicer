import React, { useState, useEffect } from 'react';
import filaments from '../data/filaments.json';
import './ColorPicker.css';

interface ColorPickerProps {
  onColorSelect: (color: string, td: number) => void;
  onClose: () => void;
  initialColor?: string;
  initialTd?: number;
}

interface FilamentColor {
  name: string;
  color: string;
  td: number;
  id?: string;
}

// Função para calcular a luminosidade de uma cor
const calculateLuminance = (color: string): number => {
  // Remove o # se existir
  const hex = color.replace('#', '');
  
  // Converte hex para RGB
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  // Calcula a luminância relativa
  // Usando a fórmula: L = 0.2126 * R + 0.7152 * G + 0.0722 * B
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Função para sugerir TD baseado na luminância
const suggestTD = (luminance: number): number => {
  // Cores escuras (luminância baixa) precisam de menos camadas
  // Cores claras (luminância alta) precisam de mais camadas
  if (luminance < 0.1) return 0.6;       // Cores extremamente escuras (preto)
  if (luminance < 0.2) return 1.2;       // Cores muito escuras
  if (luminance < 0.3) return 2.0;       // Cores escuras
  if (luminance < 0.4) return 3.0;       // Cores médio-escuras
  if (luminance < 0.5) return 4.0;       // Cores médias
  if (luminance < 0.6) return 5.0;       // Cores médio-claras
  if (luminance < 0.7) return 6.0;       // Cores claras
  if (luminance < 0.8) return 7.0;       // Cores muito claras
  if (luminance < 0.9) return 8.5;       // Cores extremamente claras
  return 10.0;                           // Branco puro e cores próximas
};

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  onColorSelect, 
  onClose,
  initialColor = '#000000',
  initialTd = 1
}) => {
  const [activeTab, setActiveTab] = useState<string>('custom');
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [customTd, setCustomTd] = useState(initialTd);
  const [availableColors, setAvailableColors] = useState<FilamentColor[]>([]);
  const [brands] = useState<string[]>(['custom', ...filaments.brands.map(brand => brand.name)]);

  // Atualiza o TD automaticamente quando a cor muda no modo custom
  useEffect(() => {
    if (activeTab === 'custom') {
      const luminance = calculateLuminance(selectedColor);
      const suggestedTd = suggestTD(luminance);
      setCustomTd(suggestedTd);
    }
  }, [selectedColor, activeTab]);

  // Atualiza as cores disponíveis quando a marca é selecionada
  useEffect(() => {
    if (activeTab === 'custom') {
      setAvailableColors([]);
      return;
    }

    const brand = filaments.brands.find(b => b.name === activeTab);
    if (brand) {
      const material = brand.materials.find(m => m.type === 'PLA'); // PLA por padrão
      if (material) {
        const colors: FilamentColor[] = [];
        material.variants.forEach(variant => {
          variant.filaments.forEach(filament => {
            colors.push({
              name: filament.name,
              color: filament.color,
              td: filament.td,
              id: filament.name.match(/\(([^)]+)\)/)?.[1] // Extrai o ID entre parênteses
            });
          });
        });
        setAvailableColors(colors);
      }
    }
  }, [activeTab]);

  const handleColorSelect = (color: FilamentColor) => {
    setSelectedColor(color.color);
    setCustomTd(color.td);
    onColorSelect(color.color, color.td);
    onClose();
  };

  const handleCustomColorSubmit = () => {
    onColorSelect(selectedColor, customTd);
    onClose();
  };

  return (
    <div className="color-picker-overlay">
      <div className="color-picker-container">
        <h3>Select Color</h3>
        
        <div className="tabs">
          {brands.map((brand) => (
            <button
              key={brand}
              className={`tab ${activeTab === brand ? 'active' : ''}`}
              onClick={() => setActiveTab(brand)}
            >
              {brand === 'custom' ? 'Custom' : brand}
            </button>
          ))}
        </div>

        <div className="color-picker-section">
          {activeTab === 'custom' ? (
            <>
              <label>Custom Color:</label>
              <div className="color-input-container">
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                />
                <input
                  type="text"
                  value={selectedColor.toUpperCase()}
                  onChange={(e) => setSelectedColor(e.target.value)}
                />
              </div>

              <label>Transmission Distance (layers):</label>
              <input
                type="number"
                className="td-input"
                min="0.1"
                step="0.1"
                value={customTd}
                onChange={(e) => setCustomTd(Number(e.target.value))}
              />

              <div className="color-picker-buttons">
                <button onClick={handleCustomColorSubmit}>Confirm</button>
                <button onClick={onClose}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              {availableColors.length > 0 ? (
                <div className="color-grid">
                  {availableColors.map((color, index) => (
                    <div
                      key={index}
                      className={`color-option`}
                      style={{ backgroundColor: color.color }}
                      onClick={() => handleColorSelect(color)}
                    >
                      <div className="color-tooltip">
                        {color.name}
                        {color.id && ` (${color.id})`}
                        <br />
                        TD: {color.td} layers
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#666' }}>No colors available</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker; 