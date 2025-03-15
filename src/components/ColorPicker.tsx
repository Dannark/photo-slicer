import React, { useState, useEffect } from 'react';
import filaments from '../data/filaments.json';
import './ColorPicker.css';

interface ColorPickerProps {
  onColorSelect: (color: string, td: number) => void;
  onClose: () => void;
  initialColor?: string;
  initialTd?: number;
}

interface Filament {
  Brand: string;
  Color: string;
  Name: string;
  Owned: boolean;
  Transmissivity: number;
  Type: string;
  uuid: string;
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

// Função para sugerir Transmissivity baseado na luminância
const suggestTransmissivity = (luminance: number): number => {
  // Cores escuras (luminância baixa) precisam de menos distância
  // Cores claras (luminância alta) precisam de mais distância
  if (luminance < 0.1) return 0.3;       // Cores extremamente escuras (preto)
  if (luminance < 0.2) return 0.6;       // Cores muito escuras
  if (luminance < 0.3) return 1.0;       // Cores escuras
  if (luminance < 0.4) return 1.5;       // Cores médio-escuras
  if (luminance < 0.5) return 2.0;       // Cores médias
  if (luminance < 0.6) return 2.5;       // Cores médio-claras
  if (luminance < 0.7) return 3.0;       // Cores claras
  if (luminance < 0.8) return 3.5;       // Cores muito claras
  if (luminance < 0.9) return 4.0;       // Cores extremamente claras
  return 4.5;                            // Branco puro e cores próximas
};

const ColorPicker: React.FC<ColorPickerProps> = ({ 
  onColorSelect, 
  onClose,
  initialColor = '#000000',
  initialTd = 0.3
}) => {
  const [activeTab, setActiveTab] = useState<string>('custom');
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [customTd, setCustomTd] = useState(initialTd);
  const [availableColors, setAvailableColors] = useState<Filament[]>([]);
  const [brands] = useState<string[]>(['custom', ...Array.from(new Set(filaments.Filaments.map(f => f.Type)))]);

  // Atualiza o TD automaticamente quando a cor muda no modo custom
  useEffect(() => {
    if (activeTab === 'custom') {
      const luminance = calculateLuminance(selectedColor);
      const suggestedTd = suggestTransmissivity(luminance);
      setCustomTd(suggestedTd);
    }
  }, [selectedColor, activeTab]);

  // Atualiza as cores disponíveis quando o tipo é selecionado
  useEffect(() => {
    if (activeTab === 'custom') {
      setAvailableColors([]);
      return;
    }

    const typeFilaments = filaments.Filaments.filter(f => f.Type === activeTab);
    setAvailableColors(typeFilaments);
  }, [activeTab]);

  const handleColorSelect = (filament: Filament) => {
    setSelectedColor(filament.Color);
    setCustomTd(filament.Transmissivity);
    onColorSelect(filament.Color, filament.Transmissivity);
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
          {brands.map((type) => (
            <button
              key={type}
              className={`tab ${activeTab === type ? 'active' : ''}`}
              onClick={() => setActiveTab(type)}
            >
              {type === 'custom' ? 'Custom' : type}
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

              <label>Transmission Distance (mm):</label>
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
                <div>
                  {Array.from(new Set(availableColors.map(f => f.Brand))).map(brand => (
                    <div key={brand} className="filament-type-section">
                      <div className="filament-type-title">{brand}</div>
                      <div className="color-grid">
                        {availableColors
                          .filter(f => f.Brand === brand)
                          .map((filament) => (
                            <div
                              key={filament.uuid}
                              className={`color-option`}
                              style={{ backgroundColor: filament.Color }}
                              onClick={() => handleColorSelect(filament)}
                            >
                              <div className="color-tooltip">
                                {filament.Name}
                                <br />
                                TD: {filament.Transmissivity.toFixed(1)} mm
                              </div>
                            </div>
                          ))}
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