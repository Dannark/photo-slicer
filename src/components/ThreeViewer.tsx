import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { LayerConfig } from './HeightControls';
import ExportInfo from './ExportInfo';
import ExportDropdown from './ExportDropdown';
import { TD_DIVISOR } from '../constants/config';
import { exportToSTL, exportToBambu3MF, exportToGeneric3MF, exportToPrusa3MF } from '../services/exportService';

// Constantes de dimensão
const MODEL_MAX_SIZE = 100;  // Dimensão máxima em mm

interface ThreeViewerProps {
  imageUrl: string | null;
  baseHeight: number; // Agora representa a altura total
  baseThickness: number;
  layers: LayerConfig[];
  resolution: number;
  layerHeight: number;
}

interface HeightMapRef {
  exportToSTL: () => void;
  exportToGeneric3MF: () => void;
  exportToPrusa3MF: () => void;
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
}>(({ texture, baseHeight, baseThickness, layers, resolution, isSteppedMode, showTDMode, layerHeight }, ref) => {
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
    if (meshRef.current) {
      const initialColors = Array(5).fill(null).map(() => new THREE.Color(0x000000));
      const initialHeights = Array(5).fill(1.0);
      const initialTDs = Array(5).fill(0.0);

      layers.forEach((layer, index) => {
        initialColors[index].set(layer.color);
        initialHeights[index] = layer.heightPercentage / 100;
        initialTDs[index] = layer.td;
      });

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
          numLayers: { value: layers.length },
          baseThickness: { value: baseThickness },
          firstLayerHeight: { value: layerHeight * 2 },
          tdDivisor: { value: TD_DIVISOR }
        },
        vertexShader: `
          uniform sampler2D heightMap;
          uniform float baseHeight;
          uniform float layerHeights[5];
          uniform bool isSteppedMode;
          uniform float layerHeight;
          uniform float baseThickness;
          uniform float firstLayerHeight;
          varying float vLayerNumber;
          
          float getSteppedHeight(float height) {
            float numLayers = floor(height / layerHeight);
            return numLayers * layerHeight;
          }
          
          void main() {
            vec4 heightColor = texture2D(heightMap, uv);
            float height = heightColor.r * baseHeight;
            
            if (isSteppedMode) {
              height = getSteppedHeight(height);
            }
            
            // Calcula o número da camada atual
            float totalHeight = height + baseThickness;
            float currentLayer = 1.0; // Começa na camada 1 (base)
            
            // Se passou da base
            if (totalHeight > baseThickness) {
              // Se está na primeira camada
              if (totalHeight <= baseThickness + firstLayerHeight) {
                currentLayer = 2.0; // Camada 2 (primeira camada colorida)
              } else {
                // Calcula qual camada está baseado na altura
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
          uniform vec3 layerColors[5];
          uniform float layerHeights[5];
          uniform float layerTDs[5];
          uniform int numLayers;
          uniform float baseThickness;
          uniform float firstLayerHeight;
          uniform float layerHeight;
          uniform float baseHeight;
          uniform bool isSteppedMode;
          uniform bool showTDMode;
          uniform float tdDivisor;
          varying float vLayerNumber;
          
          vec3 interpolateColor(vec3 color1, vec3 color2, float factor) {
            return mix(color1, color2, factor);
          }

          void main() {
            vec3 color = layerColors[0];
            
            // Calcula o número total de camadas
            float additionalBaseThickness = max(0.0, baseThickness - firstLayerHeight);
            float additionalBaseLayers = floor(additionalBaseThickness / layerHeight);
            float totalLayers = floor(baseHeight / layerHeight) + additionalBaseLayers + 1.0;
            
            // Normaliza o número da camada para o intervalo 0-1
            float normalizedLayer = (vLayerNumber - 1.0) / totalLayers;
            
            if (showTDMode) {
              // Modo TD - Transição suave baseada no TD
              vec3 previousColor = layerColors[0];
              
              for(int i = 1; i < 5; i++) {
                if(i < numLayers && normalizedLayer >= layerHeights[i-1]) {
                  // Dividimos o TD para obter a distância real de transição
                  float td = layerTDs[i] / tdDivisor;
                  float layersForTransition = td / layerHeight;
                  float currentLayerInSection = (normalizedLayer - layerHeights[i-1]) * totalLayers;
                  float progress = min(1.0, currentLayerInSection / layersForTransition);
                  color = interpolateColor(previousColor, layerColors[i], progress);
                  previousColor = layerColors[i];
                }
              }
            } else {
              // Modo normal - Cores sólidas
              for(int i = 1; i < 5; i++) {
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
    }
  }, [texture, baseHeight, baseThickness, layers, isSteppedMode, showTDMode, layerHeight]);

  // Atualiza os uniforms quando necessário
  useEffect(() => {
    if (materialRef.current) {
      try {
        const colors = Array(5).fill(null).map(() => new THREE.Color(0x000000));
        const heights = Array(5).fill(1.0);
        const tds = Array(5).fill(0.0);

        layers.forEach((layer, index) => {
          colors[index].set(layer.color);
          heights[index] = layer.heightPercentage / 100;
          tds[index] = layer.td;
        });

        materialRef.current.uniforms.heightMap.value = texture;
        materialRef.current.uniforms.baseHeight.value = baseHeight;
        materialRef.current.uniforms.layerColors.value = colors;
        materialRef.current.uniforms.layerHeights.value = heights;
        materialRef.current.uniforms.layerTDs.value = tds;
        materialRef.current.uniforms.isSteppedMode.value = isSteppedMode;
        materialRef.current.uniforms.showTDMode.value = showTDMode;
        materialRef.current.uniforms.layerHeight.value = layerHeight;
        materialRef.current.uniforms.numLayers.value = layers.length;
        materialRef.current.uniforms.baseThickness.value = baseThickness;
        materialRef.current.uniforms.firstLayerHeight.value = layerHeight * 2;
        materialRef.current.uniforms.tdDivisor.value = TD_DIVISOR;
        materialRef.current.needsUpdate = true;

      } catch (error) {
        console.error('Erro ao atualizar uniforms:', error);
      }
    }
  }, [texture, baseHeight, baseThickness, layers, isSteppedMode, showTDMode, layerHeight]);

  const createGeometryWithHeight = () => {
    // Calcula as dimensões baseadas na proporção da imagem
    const dimensions = calculateDimensions(texture.image.width, texture.image.height);
    
    // Cria a geometria inicial com as dimensões proporcionais
    const geometry = new THREE.PlaneGeometry(
      dimensions.width,
      dimensions.height,
      Math.floor(resolution * (dimensions.width / MODEL_MAX_SIZE)) - 1,
      Math.floor(resolution * (dimensions.height / MODEL_MAX_SIZE)) - 1
    );

    const canvas = document.createElement('canvas');
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Desenha a textura no canvas para ler os pixels
    ctx.drawImage(texture.image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Atualiza os vértices com base na altura
    const positions = geometry.attributes.position.array;
    const baseThicknessValue = baseThickness;

    // Função para calcular a altura em degraus
    const getSteppedHeight = (height: number) => {
      // Calcula quantas camadas completas cabem nesta altura
      const numLayers = Math.floor(height / layerHeight);
      return numLayers * layerHeight;
    };

    // Primeiro, vamos mapear todos os vértices e suas alturas
    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];

      // Ajusta o mapeamento de pixels para considerar as dimensões proporcionais
      const pixelX = Math.floor((x + dimensions.width/2) / dimensions.width * (canvas.width - 1));
      const pixelY = Math.floor((y + dimensions.height/2) / dimensions.height * (canvas.height - 1));
      const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

      let height = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / (3 * 255) * baseHeight;
      
      // Aplica o modo stepped se estiver ativo
      if (isSteppedMode) {
        height = getSteppedHeight(height);
      }
      
      positions[idx + 2] = height;
    }

    // Atualiza a geometria
    geometry.computeVertexNormals();
    return geometry;
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
    
    // Salva a posição original da câmera e cor de fundo
    const originalPosition = camera.position.clone();
    const originalRotation = camera.rotation.clone();
    const originalBackground = scene.background;
    
    // Configura a cena para o thumbnail
    // scene.background = new THREE.Color(0xeeeeee); // Cinza claro
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
    
    await exportToPrusa3MF(exportGeometry, layers, layerHeight, layerHeight * 2, baseThickness, imageData);
  };

  React.useImperativeHandle(ref, () => ({
    exportToSTL: exportToSTLHandler,
    exportToGeneric3MF: exportToGeneric3MFHandler,
    exportToPrusa3MF: exportToPrusaHandler
  }));

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[dimensions.width, dimensions.height, Math.floor(resolution * (dimensions.width / MODEL_MAX_SIZE)) - 1, Math.floor(resolution * (dimensions.height / MODEL_MAX_SIZE)) - 1]} />
    </mesh>
  );
});

const ThreeViewer: React.FC<ThreeViewerProps> = ({ imageUrl, baseHeight, baseThickness, layers, resolution, layerHeight }) => {
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
            />
          )}
        </Canvas>
      </div>
      {showExportInfo && (
        <ExportInfo
          firstLayerHeight={layerHeight * 2}
          layerHeight={layerHeight}
          layers={layers}
          numLayers={Math.floor(baseHeight / layerHeight)}
          baseThickness={baseThickness}
          onClose={() => setShowExportInfo(false)}
        />
      )}
    </div>
  );
};

export default ThreeViewer;
