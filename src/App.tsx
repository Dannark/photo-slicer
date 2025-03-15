import React, { useState } from 'react';
import './App.css';
import ImageUploader from './components/ImageUploader';
import ThreeViewer from './components/ThreeViewer';
import HeightControls, { LayerConfig } from './components/HeightControls';
import LayerColorSlider from './components/LayerColorSlider';

const DEFAULT_LAYER_HEIGHT = 0.08; // mm por camada
const DEFAULT_BASE_LAYERS = 0; // Começa sem camadas base
const DEFAULT_RESOLUTION = 200; // Resolução padrão da malha

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [numLayers, setNumLayers] = useState(25); // Valor padrão de 25 camadas
  const [layerHeight, setLayerHeight] = useState(DEFAULT_LAYER_HEIGHT);
  const [baseThickness, setBaseThickness] = useState(DEFAULT_BASE_LAYERS * DEFAULT_LAYER_HEIGHT);
  const [resolution, setResolution] = useState(DEFAULT_RESOLUTION);
  const [layers, setLayers] = useState<LayerConfig[]>([
    { color: '#000000', heightPercentage: 10, td: 0.6 },   // Preto
    { color: '#666666', heightPercentage: 33, td: 1.4 },  // Cinza escuro
    { color: '#CCCCCC', heightPercentage: 66, td: 2.0 },  // Cinza claro
    { color: '#FFFFFF', heightPercentage: 100, td: 2.0 }  // Branco
  ]);
  const [imageData, setImageData] = useState<ImageData | undefined>(undefined);

  // Calcula a altura total baseada no número de camadas
  const totalHeight = ((numLayers - 1) * layerHeight) + (layerHeight * 2) + Math.max(0, baseThickness - (layerHeight * 2));

  const handleImageUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    // Cria um canvas temporário para extrair o imageData
    const img = new Image();
    img.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0);
        const newImageData = tempCtx.getImageData(0, 0, img.width, img.height);
        setImageData(newImageData);
      }
    };
    img.src = url;
  };

  const handleLayersChange = (newLayers: LayerConfig[]) => {
    // console.log('App - Layers atualizados:', newLayers);
    setLayers(newLayers);
  };

  return (
    <div className="App">
      <div className="container">
        <header className="App-header">
          <div className="header-content">
            <h1>Photo Slicer</h1>
            <div className="header-buttons">
              <ImageUploader onImageUpload={handleImageUpload} imageLoaded={!!imageUrl} />
              <a 
                href="https://ko-fi.com/Dannark" 
                target="_blank" 
                rel="noopener noreferrer"
                className="donate-button"
              >
                ☕ Buy me a coffee
              </a>
            </div>
          </div>
        </header>

        {imageUrl && (
          <>
            <aside className="sidebar">
              <HeightControls
                numLayers={numLayers}
                onNumLayersChange={setNumLayers}
                baseThickness={baseThickness}
                onBaseThicknessChange={setBaseThickness}
                layerHeight={layerHeight}
                onLayerHeightChange={setLayerHeight}
                resolution={resolution}
                onResolutionChange={setResolution}
              />
              <LayerColorSlider
                layers={layers}
                onChange={handleLayersChange}
                layerHeight={layerHeight}
                totalHeight={totalHeight}
                imageData={imageData}
                baseThickness={baseThickness}
              />
            </aside>

            <main className="main-content">
              <ThreeViewer
                imageUrl={imageUrl}
                baseHeight={totalHeight}
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
