import React, { useState } from 'react';
import ImageUploader from './components/ImageUploader';
import ThreeViewer from './components/ThreeViewer';
import HeightControls, { LayerConfig } from './components/HeightControls';
import './App.css';

const DEFAULT_LAYERS: LayerConfig[] = [
  { color: '#000000', heightPercentage: 0 },   // Preto
  { color: '#666666', heightPercentage: 25 },  // Cinza escuro
  { color: '#CCCCCC', heightPercentage: 50 },  // Cinza claro
  { color: '#FFFFFF', heightPercentage: 75 },  // Branco
];

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [baseHeight, setBaseHeight] = useState<number>(2); // 2mm de altura padrão
  const [layers, setLayers] = useState<LayerConfig[]>(DEFAULT_LAYERS);

  const handleImageUpload = (uploadedImageUrl: string) => {
    setImageUrl(uploadedImageUrl);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Photo to 3D Converter</h1>
      </header>
      <main>
        <div className="container">
          <section className="upload-section">
            <ImageUploader onImageUpload={handleImageUpload} />
          </section>
          {imageUrl && (
            <>
              <section className="controls-section">
                <HeightControls
                  baseHeight={baseHeight}
                  onBaseHeightChange={setBaseHeight}
                  layers={layers}
                  onLayersChange={setLayers}
                />
              </section>
              <section className="viewer-section">
                <ThreeViewer 
                  imageUrl={imageUrl}
                  baseHeight={baseHeight}
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
