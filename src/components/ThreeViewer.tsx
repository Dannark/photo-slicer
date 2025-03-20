import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { LayerConfig } from './HeightControls';
import ExportInfo from './ExportInfo';
import ExportDropdown from './ExportDropdown';
import { TD_MULTIPLIER } from '../constants/config';
import { exportToSTL, exportToBambu3MF, exportToGeneric3MF, exportToPrusa3MF } from '../services/exportService';
import { HeightMode } from '../patterns/types/types';
import { calculateColorBasedHeight } from '../utils/colorHeightMapping';

// Constantes de dimensão
const MODEL_MAX_SIZE = 100;  // Dimensão máxima em mm

interface ThreeViewerProps {
  imageUrl: string | null;
  baseHeight: number; // Agora representa a altura total
  baseThickness: number;
  layers: LayerConfig[];
  resolution: number;
  layerHeight: number;
  heightMode: HeightMode;
}

interface HeightMapRef {
  exportToSTL: () => void;
  exportToGeneric3MF: () => void;
  exportToPrusa3MF: () => void;
  exportToBambu3MF: () => void;
}

const HeightMap = React.forwardRef<HeightMapRef, {
  texture: THREE.Texture;
  baseHeight: number;
  baseThickness: number;
  layers: LayerConfig[];
  resolution: number;
  isSteppedMode: boolean;
  showTDMode: boolean;
  layerHeight: number;
  heightMode: HeightMode;
}>(({ texture, baseHeight, baseThickness, layers, resolution, isSteppedMode, showTDMode, layerHeight, heightMode }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { scene, gl, camera } = useThree();

  // Calcula as dimensões mantendo a proporção da imagem
  const calculateDimensions = (width: number, height: number) => {
    const aspectRatio = width / height;
    let modelWidth, modelHeight;

    if (aspectRatio > 1) {
      modelWidth = MODEL_MAX_SIZE;
      modelHeight = MODEL_MAX_SIZE / aspectRatio;
    } else {
      modelHeight = MODEL_MAX_SIZE;
      modelWidth = MODEL_MAX_SIZE * aspectRatio;
    }

    return { width: modelWidth, height: modelHeight };
  };

  const dimensions = calculateDimensions(texture.image.width, texture.image.height);

  useEffect(() => {
    if (meshRef.current && THREE.Color) {
      try {
        const MAX_COLORS = 15;
        const initialColors: THREE.Color[] = [];
        const initialHeights: number[] = [];
        const initialTDs: number[] = [];

        for (let i = 0; i < MAX_COLORS; i++) {
          initialColors.push(new THREE.Color(0x000000));
          initialHeights.push(1.0);
          initialTDs.push(0.0);
        }

        if (Array.isArray(layers)) {
          layers.forEach((layer, index) => {
            if (layer && typeof layer.color === 'string' && index < MAX_COLORS) {
              try {
                initialColors[index].set(layer.color);
                initialHeights[index] = (layer.heightPercentage || 0) / 100;
                initialTDs[index] = layer.td || 0;
              } catch (error) {
                console.error('Erro ao processar camada:', error);
              }
            }
          });
        }

        const material = new THREE.ShaderMaterial({
          uniforms: {
            heightMap: { value: texture },
            baseHeight: { value: baseHeight },
            layerColors: { value: initialColors },
            layerHeights: { value: initialHeights },
            layerTDs: { value: initialTDs },
            isSteppedMode: { value: isSteppedMode },
            showTDMode: { value: showTDMode },
            layerHeight: { value: layerHeight },
            numLayers: { value: Array.isArray(layers) ? layers.length : 0 },
            baseThickness: { value: baseThickness },
            firstLayerHeight: { value: layerHeight * 2 },
            tdMultiplier: { value: TD_MULTIPLIER },
            isColorMappingMode: { value: heightMode === HeightMode.COLOR_MAPPING }
          },
          vertexShader: `
            uniform sampler2D heightMap;
            uniform float baseHeight;
            uniform vec3 layerColors[15];
            uniform float layerHeights[15];
            uniform bool isSteppedMode;
            uniform float layerHeight;
            uniform float baseThickness;
            uniform float firstLayerHeight;
            uniform bool isColorMappingMode;
            varying float vLayerNumber;
            varying vec2 vUv;
            
            float getSteppedHeight(float height) {
              float numLayers = floor(height / layerHeight);
              return numLayers * layerHeight;
            }

            float findClosestColorHeight(vec3 pixelColor) {
              float minDistance = 1000000.0;
              float closestHeight = 0.0;
              
              for(int i = 0; i < 15; i++) {
                vec3 layerColor = layerColors[i];
                float distance = length(pixelColor - layerColor);
                if(distance < minDistance) {
                  minDistance = distance;
                  closestHeight = layerHeights[i];
                }
              }
              
              return closestHeight;
            }
            
            void main() {
              vUv = uv;
              vec4 heightColor = texture2D(heightMap, uv);
              float height;
              
              if (isColorMappingMode) {
                height = findClosestColorHeight(heightColor.rgb) * baseHeight;
              } else {
                height = ((heightColor.r + heightColor.g + heightColor.b) / 3.0) * baseHeight;
              }
              
              if (isSteppedMode) {
                height = getSteppedHeight(height);
              }
              
              float totalHeight = height + baseThickness;
              float currentLayer = 1.0;
              
              if (totalHeight > baseThickness) {
                if (totalHeight <= baseThickness + firstLayerHeight) {
                  currentLayer = 2.0;
                } else {
                  float heightAboveFirst = totalHeight - (baseThickness + firstLayerHeight);
                  currentLayer = 3.0 + floor(heightAboveFirst / layerHeight);
                }
              }
              
              vLayerNumber = currentLayer;
              
              vec3 pos = position;
              pos.z += height;
              
              gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
          `,
          fragmentShader: `
            uniform vec3 layerColors[15];
            uniform float layerHeights[15];
            uniform float layerTDs[15];
            uniform int numLayers;
            uniform float baseThickness;
            uniform float firstLayerHeight;
            uniform float layerHeight;
            uniform float baseHeight;
            uniform bool isSteppedMode;
            uniform bool showTDMode;
            uniform float tdMultiplier;
            uniform bool isColorMappingMode;
            varying float vLayerNumber;
            varying vec2 vUv;
            
            vec3 blendColors(vec3 topColor, vec3 bottomColor, float alpha) {
              return mix(bottomColor, topColor, alpha);
            }

            vec3 applyColorLayers(vec3 topColor, vec3 bottomColor, float baseAlpha, int numLayers) {
              vec3 result = bottomColor;
              // Limita o número de iterações para evitar loops infinitos
              for(int i = 0; i < 50; i++) {
                if(i >= numLayers) break;
                result = blendColors(topColor, result, baseAlpha);
              }
              return result;
            }

            void main() {
              vec3 color = layerColors[0];
              
              float additionalBaseThickness = max(0.0, baseThickness - firstLayerHeight);
              float additionalBaseLayers = floor(additionalBaseThickness / layerHeight);
              float totalLayers = floor(baseHeight / layerHeight) + additionalBaseLayers + 1.0;
              float normalizedLayer = (vLayerNumber - 1.0) / totalLayers;
              
              if (showTDMode) {
                vec3 previousColor = layerColors[0];
                
                for(int i = 1; i < 15; i++) {
                  if(i < numLayers && normalizedLayer >= layerHeights[i-1]) {
                    float td = layerTDs[i] * tdMultiplier;
                    float layersForTransition = td / layerHeight;
                    float currentLayerInSection = (normalizedLayer - layerHeights[i-1]) * totalLayers;
                    
                    if (currentLayerInSection < layersForTransition) {
                      float baseAlpha = min(1.0, max(0.01, 1.0 / td));
                      int remainingLayers = int(currentLayerInSection) + 1;
                      color = applyColorLayers(layerColors[i], previousColor, baseAlpha, remainingLayers);
                    } else {
                      color = layerColors[i];
                    }
                    
                    previousColor = layerColors[i];
                  }
                }
              } else {
                for(int i = 1; i < 15; i++) {
                  if(i < numLayers && normalizedLayer >= layerHeights[i-1]) {
                    color = layerColors[i];
                  }
                }
              }
              
              gl_FragColor = vec4(color, 1.0);
            }
          `
        });

        materialRef.current = material;
        meshRef.current.material = material;
      } catch (error) {
        console.error('Erro ao criar material:', error);
      }
    }
  }, [texture, baseHeight, baseThickness, layers, isSteppedMode, showTDMode, layerHeight, heightMode]);

  // Atualiza os uniforms quando necessário
  useEffect(() => {
    if (materialRef.current) {
      try {
        const MAX_COLORS = 15;
        const colors = Array(MAX_COLORS).fill(null).map(() => new THREE.Color(0x000000));
        const heights = Array(MAX_COLORS).fill(1.0);
        const tds = Array(MAX_COLORS).fill(0.0);

        if (Array.isArray(layers)) {
          layers.forEach((layer, index) => {
            if (layer && typeof layer.color === 'string' && index < MAX_COLORS) {
              try {
                colors[index].set(layer.color);
                heights[index] = (layer.heightPercentage || 0) / 100;
                tds[index] = layer.td || 0;
              } catch (error) {
                console.error('Erro ao atualizar uniforms da camada:', error);
                colors[index].set('#000000');
                heights[index] = 0;
                tds[index] = 0;
              }
            }
          });
        }

        materialRef.current.uniforms.heightMap.value = texture;
        materialRef.current.uniforms.baseHeight.value = baseHeight;
        materialRef.current.uniforms.layerColors.value = colors;
        materialRef.current.uniforms.layerHeights.value = heights;
        materialRef.current.uniforms.layerTDs.value = tds;
        materialRef.current.uniforms.isSteppedMode.value = isSteppedMode;
        materialRef.current.uniforms.showTDMode.value = showTDMode;
        materialRef.current.uniforms.layerHeight.value = layerHeight;
        materialRef.current.uniforms.numLayers.value = Array.isArray(layers) ? layers.length : 0;
        materialRef.current.uniforms.baseThickness.value = baseThickness;
        materialRef.current.uniforms.firstLayerHeight.value = layerHeight * 2;
        materialRef.current.uniforms.tdMultiplier.value = TD_MULTIPLIER;
        materialRef.current.uniforms.isColorMappingMode.value = heightMode === HeightMode.COLOR_MAPPING;
        materialRef.current.needsUpdate = true;

      } catch (error) {
        console.error('Erro ao atualizar uniforms:', error);
      }
    }
  }, [texture, baseHeight, baseThickness, layers, isSteppedMode, showTDMode, layerHeight, heightMode]);

  const createGeometryWithHeight = () => {
    const dimensions = calculateDimensions(texture.image.width, texture.image.height);
    const geometry = new THREE.PlaneGeometry(
      dimensions.width,
      dimensions.height,
      Math.floor(resolution * (dimensions.width / MODEL_MAX_SIZE)) - 1,
      Math.floor(resolution * (dimensions.height / MODEL_MAX_SIZE)) - 1
    );

    // Função para calcular a altura em degraus
    const getSteppedHeight = (height: number) => {
      // Calcula quantas camadas completas cabem nesta altura
      const numLayers = Math.floor(height / layerHeight);
      return numLayers * layerHeight;
    };

    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(texture.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];

      const pixelX = Math.floor((x + dimensions.width/2) / dimensions.width * (canvas.width - 1));
      const pixelY = Math.floor((y + dimensions.height/2) / dimensions.height * (canvas.height - 1));
      const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

      let height;
      if (heightMode === HeightMode.COLOR_MAPPING) {
        const pixelColor: [number, number, number] = [
          pixels[pixelIndex],
          pixels[pixelIndex + 1],
          pixels[pixelIndex + 2]
        ];
        height = (calculateColorBasedHeight(pixelColor, layers) / 100) * baseHeight;
      } else {
        // Modo luminância padrão
        height = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / (3 * 255) * baseHeight;
      }
      
      if (isSteppedMode) {
        height = getSteppedHeight(height);
      }
      
      positions[idx + 2] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  };

  const captureModelThumbnail = async () => {
    // Salva a posição original da câmera e cor de fundo
    const originalPosition = camera.position.clone();
    const originalRotation = camera.rotation.clone();
    const originalBackground = scene.background;
    
    // Configura a cena para o thumbnail
    camera.position.set(0, 240, 180);
    camera.lookAt(0, 0, 0);
    
    // Força uma renderização e espera o próximo frame
    gl.render(scene, camera);
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    // Captura a imagem
    const imageData = gl.domElement.toDataURL('image/png');
    
    // Restaura as configurações originais
    camera.position.copy(originalPosition);
    camera.rotation.copy(originalRotation);
    scene.background = originalBackground;
    gl.render(scene, camera);

    return imageData;
  };

  const exportToSTLHandler = () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;
    exportToSTL(exportGeometry, baseThickness);
  };

  const exportToGeneric3MFHandler = async () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;
    await exportToGeneric3MF(exportGeometry, layers, layerHeight, layerHeight * 2, baseThickness);
  };

  const exportToPrusaHandler = async () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;
    
    const imageData = await captureModelThumbnail();
    await exportToPrusa3MF(exportGeometry, layers, layerHeight, layerHeight * 2, baseThickness, imageData);
  };

  const exportToBambuHandler = async () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;
    
    const imageData = await captureModelThumbnail();
    await exportToBambu3MF(exportGeometry, layers, layerHeight, layerHeight * 2, baseThickness, imageData);
  };

  React.useImperativeHandle(ref, () => ({
    exportToSTL: exportToSTLHandler,
    exportToGeneric3MF: exportToGeneric3MFHandler,
    exportToPrusa3MF: exportToPrusaHandler,
    exportToBambu3MF: exportToBambuHandler
  }));

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[dimensions.width, dimensions.height, Math.floor(resolution * (dimensions.width / MODEL_MAX_SIZE)) - 1, Math.floor(resolution * (dimensions.height / MODEL_MAX_SIZE)) - 1]} />
    </mesh>
  );
});

const ThreeViewer: React.FC<ThreeViewerProps> = ({ imageUrl, baseHeight, baseThickness, layers, resolution, layerHeight, heightMode }) => {
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const [isSteppedMode, setIsSteppedMode] = React.useState(false);
  const [showTDMode, setShowTDMode] = React.useState(true);
  const [showExportInfo, setShowExportInfo] = React.useState(false);
  const heightMapRef = useRef<HeightMapRef>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        imageUrl,
        (loadedTexture) => {
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.error('ThreeViewer - Erro ao carregar textura:', error);
        }
      );
    }
  }, [imageUrl]);

  const handleExportSTL = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToSTL();
      setShowExportInfo(true);
    }
  };

  const handleExportGeneric3MF = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToGeneric3MF();
    }
  };

  const handleExportPrusa = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToPrusa3MF();
    }
  };

  const handleExportBambu = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToBambu3MF();
    }
  };

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="three-viewer">
      <div className="viewer-controls">
        <button
          className={`preview-mode-button ${isSteppedMode ? 'active' : ''}`}
          onClick={() => setIsSteppedMode(!isSteppedMode)}
        >
          {isSteppedMode ? 'Smooth View' : 'Layer View'}
        </button>
        <button
          className={`preview-mode-button ${showTDMode ? 'active' : ''}`}
          onClick={() => setShowTDMode(!showTDMode)}
        >
          {showTDMode ? 'Solid Colors' : 'TD View'}
        </button>
        <button
          className="preview-mode-button"
          onClick={() => setShowExportInfo(true)}
        >
          Slicing Info
        </button>
        {texture && (
          <ExportDropdown
            onExportSTL={handleExportSTL}
            onExportGeneric3MF={handleExportGeneric3MF}
            onExportPrusa3MF={handleExportPrusa}
            onExportBambu3MF={handleExportBambu}
          />
        )}
      </div>
      <div style={{ width: '100%', height: '500px' }}>
        <Canvas camera={{ position: [0, 50, 100], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[50, 50, 50]} />
          <OrbitControls />
          {texture && texture.image && (
            <HeightMap 
              ref={heightMapRef}
              texture={texture} 
              baseHeight={baseHeight} 
              baseThickness={baseThickness} 
              layers={layers}
              resolution={resolution}
              isSteppedMode={isSteppedMode}
              showTDMode={showTDMode}
              layerHeight={layerHeight}
              heightMode={heightMode}
            />
          )}
        </Canvas>
      </div>
      {showExportInfo && (
        <ExportInfo
          firstLayerHeight={layerHeight * 2}
          layerHeight={layerHeight}
          layers={layers}
          numLayers={Math.ceil((baseHeight - (layerHeight * 2)) / layerHeight) + 1}
          baseThickness={baseThickness}
          onClose={() => setShowExportInfo(false)}
        />
      )}
    </div>
  );
};

export default ThreeViewer;
