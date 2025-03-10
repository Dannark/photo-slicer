import React, { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import ThreeViewer from './components/ThreeViewer';
import HeightControls, { LayerConfig } from './components/HeightControls';

const DEFAULT_LAYER_HEIGHT = 0.08; // mm por camada
const DEFAULT_BASE_THICKNESS = 0.16; // 2 camadas de base por padrão
const DEFAULT_RESOLUTION = 200; // Resolução padrão da malha

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [baseHeight, setBaseHeight] = useState(2);
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [baseThickness, setBaseThickness] = useState(DEFAULT_BASE_THICKNESS);
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);
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
      <div className="container">
        <header className="App-header">
          <h1>Photo Slicer</h1>
          {!imageUrl && (
            <ImageUploader onImageUpload={handleImageUpload} />
          )}
        </header>

        {imageUrl && (
          <>
            <aside className="sidebar">
              <HeightControls
                baseHeight={baseHeight}
                onBaseHeightChange={setBaseHeight}
                baseThickness={baseThickness}
                onBaseThicknessChange={setBaseThickness}
                layerHeight={layerHeight}
                onLayerHeightChange={setLayerHeight}
                layers={layers}
                onLayersChange={setLayers}
                resolution={resolution}
                onResolutionChange={setResolution}
              />
            </aside>

            <main className="main-content">
              <ThreeViewer
                imageUrl={imageUrl}
                baseHeight={baseHeight}
                baseThickness={baseThickness}
                layers={layers}
                resolution={resolution}
                layerHeight={layerHeight}
              />
            </main>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
