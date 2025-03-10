import React, { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import ThreeViewer from './components/ThreeViewer';
import HeightControls, { LayerConfig } from './components/HeightControls';

const DEFAULT_LAYER_HEIGHT = 0.08; // mm por camada
const DEFAULT_BASE_THICKNESS = 0.16; // 2 camadas de base por padrão

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [baseHeight, setBaseHeight] = useState(2);
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [baseThickness, setBaseThickness] = useState(DEFAULT_BASE_THICKNESS);
  const [layers, setLayers] = useState<LayerConfig[]>([
    { color: '#000000', heightPercentage: 10 },   // Preto
    { color: '#666666', heightPercentage: 33 },  // Cinza escuro
    { color: '#CCCCCC', heightPercentage: 66 },  // Cinza claro
    { color: '#FFFFFF', heightPercentage: 100 }  // Branco
  ]);

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Photo to 3D Converter</h1>
      </header>
      <main>
        <div className="container">
          <section className="upload-section">
            <ImageUploader 
              onImageUpload={handleImageUpload}
              imageLoaded={!!imageUrl}
            />
          </section>
          {imageUrl && (
            <>
              <section className="controls-section">
                <HeightControls
                  baseHeight={baseHeight}
                  onBaseHeightChange={setBaseHeight}
                  baseThickness={baseThickness}
                  onBaseThicknessChange={setBaseThickness}
                  layerHeight={layerHeight}
                  onLayerHeightChange={setLayerHeight}
                  layers={layers}
                  onLayersChange={setLayers}
                />
              </section>
              <section className="viewer-section">
                <ThreeViewer 
                  imageUrl={imageUrl}
                  baseHeight={baseHeight}
                  baseThickness={baseThickness}
                  layers={layers}
                />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
