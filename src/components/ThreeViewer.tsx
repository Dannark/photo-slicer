import React, { useRef, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { LayerConfig } from './HeightControls';
import ExportInfo from './ExportInfo';

// Constantes de dimensão
const MODEL_MAX_SIZE = 100;  // Dimensão máxima em mm

interface ThreeViewerProps {
  imageUrl: string | null;
  baseHeight: number;
  baseThickness: number;
  layers: LayerConfig[];
  resolution: number;
  layerHeight: number;
}

interface HeightMapRef {
  exportToSTL: () => void;
}

const HeightMap = React.forwardRef<HeightMapRef, {
  texture: THREE.Texture;
  baseHeight: number;
  baseThickness: number;
  layers: LayerConfig[];
  resolution: number;
  isSteppedMode: boolean;
  layerHeight: number;
}>(({ texture, baseHeight, baseThickness, layers, resolution, isSteppedMode, layerHeight }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useThree();

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
      console.log('ThreeViewer - Criando material com layers:', layers);
      const initialColors = Array(5).fill(null).map(() => new THREE.Color(0x000000));
      const initialHeights = Array(5).fill(1.0);

      layers.forEach((layer, index) => {
        initialColors[index].set(layer.color);
        initialHeights[index] = layer.heightPercentage / 100;
        console.log(`ThreeViewer - Layer inicial ${index}:`, {
          color: layer.color,
          height: layer.heightPercentage / 100
        });
      });

      const material = new THREE.ShaderMaterial({
        uniforms: {
          heightMap: { value: texture },
          baseHeight: { value: baseHeight },
          layerColors: { value: initialColors },
          layerHeights: { value: initialHeights },
          isSteppedMode: { value: isSteppedMode },
          layerHeight: { value: layerHeight },
          numLayers: { value: layers.length },
          baseThickness: { value: baseThickness },
          firstLayerHeight: { value: layerHeight * 2 }
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
          uniform int numLayers;
          uniform float baseThickness;
          uniform float firstLayerHeight;
          uniform float layerHeight;
          uniform float baseHeight;
          varying float vLayerNumber;
          
          void main() {
            vec3 color = layerColors[0];
            
            // Calcula o número total de camadas
            float additionalBaseThickness = max(0.0, baseThickness - firstLayerHeight);
            float additionalBaseLayers = floor(additionalBaseThickness / layerHeight);
            float totalLayers = floor(baseHeight / layerHeight) + additionalBaseLayers + 1.0; // +1 para a primeira camada
            
            // Normaliza o número da camada para o intervalo 0-1
            float normalizedLayer = (vLayerNumber - 1.0) / totalLayers;
            
            for(int i = 1; i < 5; i++) {
              if(i < numLayers && normalizedLayer >= layerHeights[i-1]) {
                color = layerColors[i];
              }
            }
            
            gl_FragColor = vec4(color, 1.0);
          }
        `
      });

      materialRef.current = material;
      meshRef.current.material = material;
      console.log('ThreeViewer - Material criado com sucesso');
    }
  }, [texture, baseHeight, baseThickness, layers, isSteppedMode, layerHeight]);

  // Atualiza os uniforms quando necessário
  useEffect(() => {
    if (materialRef.current) {
      try {
        console.log('ThreeViewer - Atualizando uniforms com layers:', layers);
        console.log('ThreeViewer - Material atual:', materialRef.current);
        const colors = Array(5).fill(null).map(() => new THREE.Color(0x000000));
        const heights = Array(5).fill(1.0);

        layers.forEach((layer, index) => {
          colors[index].set(layer.color);
          heights[index] = layer.heightPercentage / 100;
          console.log(`ThreeViewer - Layer ${index}:`, {
            color: layer.color,
            height: layer.heightPercentage / 100
          });
        });

        materialRef.current.uniforms.heightMap.value = texture;
        materialRef.current.uniforms.baseHeight.value = baseHeight;
        materialRef.current.uniforms.layerColors.value = colors;
        materialRef.current.uniforms.layerHeights.value = heights;
        materialRef.current.uniforms.isSteppedMode.value = isSteppedMode;
        materialRef.current.uniforms.layerHeight.value = layerHeight;
        materialRef.current.uniforms.numLayers.value = layers.length;
        materialRef.current.uniforms.baseThickness.value = baseThickness;
        materialRef.current.uniforms.firstLayerHeight.value = layerHeight * 2;
        materialRef.current.needsUpdate = true;

        console.log('ThreeViewer - Uniforms atualizados:', {
          colors: colors.map(c => c.getHexString()),
          heights,
          numLayers: layers.length,
          uniforms: materialRef.current.uniforms
        });

      } catch (error) {
        console.error('Erro ao atualizar uniforms:', error);
      }
    }
  }, [baseHeight, layers, isSteppedMode, layerHeight, texture]);

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

    // Mapeia as coordenadas x e y únicas para encontrar os vértices mais externos
    const uniqueX = new Set<number>();
    const uniqueY = new Set<number>();
    
    for (let i = 0; i < positions.length; i += 3) {
      uniqueX.add(positions[i]);
      uniqueY.add(positions[i + 1]);
    }

    const sortedX = Array.from(uniqueX).sort((a, b) => a - b);
    const sortedY = Array.from(uniqueY).sort((a, b) => a - b);
    const minX = sortedX[0];
    const maxX = sortedX[sortedX.length - 1];
    const minY = sortedY[0];
    const maxY = sortedY[sortedY.length - 1];

    // Arrays para armazenar os vértices das bordas por lado
    const leftEdge: number[] = [];
    const rightEdge: number[] = [];
    const topEdge: number[] = [];
    const bottomEdge: number[] = [];
    
    // Primeiro, vamos mapear todos os vértices e suas alturas
    for (let i = 0; i < positions.length / 3; i++) {
      const idx = i * 3;
      const x = positions[idx];
      const y = positions[idx + 1];

      // Ajusta o mapeamento de pixels para considerar as dimensões proporcionais
      const pixelX = Math.floor((x - minX) / (maxX - minX) * (canvas.width - 1));
      const pixelY = Math.floor((y - minY) / (maxY - minY) * (canvas.height - 1));
      const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

      let height = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / (3 * 255) * baseHeight;
      
      // Aplica o modo stepped se estiver ativo
      if (isSteppedMode) {
        height = getSteppedHeight(height);
      }
      
      positions[idx + 2] = height;

      // Classifica os vértices das bordas usando comparação exata
      if (x === minX) leftEdge.push(i);
      if (x === maxX) rightEdge.push(i);
      if (y === minY) bottomEdge.push(i);
      if (y === maxY) topEdge.push(i);
    }

    // Ordena as bordas por coordenada para garantir continuidade
    leftEdge.sort((a, b) => positions[a * 3 + 1] - positions[b * 3 + 1]);
    rightEdge.sort((a, b) => positions[a * 3 + 1] - positions[b * 3 + 1]);
    topEdge.sort((a, b) => positions[a * 3] - positions[b * 3]);
    bottomEdge.sort((a, b) => positions[a * 3] - positions[b * 3]);

    // Cria novos vértices e faces
    const newPositions: number[] = [];
    const newIndices: number[] = [];
    const existingIndices = Array.from(geometry.index?.array || []);

    // Copia os vértices originais
    for (let i = 0; i < positions.length; i++) {
      newPositions.push(positions[i]);
    }
    const originalVertexCount = positions.length / 3;

    // Função auxiliar para criar faces da parede
    const createWallFaces = (edge: number[]) => {
      const wallVertices: number[] = [];
      
      // Cria vértices extrudados para cada vértice da borda
      edge.forEach(vertexIndex => {
        const baseIndex = vertexIndex * 3;
        newPositions.push(
          positions[baseIndex],
          positions[baseIndex + 1],
          -baseThicknessValue
        );
        wallVertices.push(newPositions.length / 3 - 1);
      });

      // Cria faces entre vértices adjacentes
      for (let i = 0; i < edge.length - 1; i++) {
        const topLeft = edge[i];
        const topRight = edge[i + 1];
        const bottomLeft = wallVertices[i];
        const bottomRight = wallVertices[i + 1];

        // Primeira face do quad
        newIndices.push(
          topLeft,
          topRight,
          bottomLeft
        );

        // Segunda face do quad
        newIndices.push(
          topRight,
          bottomRight,
          bottomLeft
        );
      }
    };

    // Cria as paredes para cada borda
    createWallFaces(leftEdge);
    createWallFaces(rightEdge);
    createWallFaces(topEdge);
    createWallFaces(bottomEdge);

    // Cria a base (bottom face)
    // Primeiro, adiciona o vértice central
    const centerX = 0;
    const centerY = 0;
    const centerZ = -baseThicknessValue;
    newPositions.push(centerX, centerY, centerZ);
    const centerIndex = newPositions.length / 3 - 1;

    // Coleta todos os vértices inferiores das paredes em ordem horária
    const bottomVertices: number[] = [];
    
    // Função auxiliar para adicionar vértices sem duplicatas
    const addUniqueVertex = (x: number, y: number) => {
      const vertexIndex = newPositions.length / 3;
      newPositions.push(x, y, -baseThicknessValue);
      bottomVertices.push(vertexIndex);
    };

    // Adiciona os vértices em ordem horária
    // Começa com a borda inferior (da esquerda para a direita)
    bottomEdge.forEach(idx => {
      addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]);
    });

    // Borda direita (de baixo para cima)
    rightEdge.forEach(idx => {
      addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]);
    });

    // Borda superior (da direita para a esquerda)
    topEdge.reverse().forEach(idx => {
      addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]);
    });

    // Borda esquerda (de cima para baixo)
    leftEdge.reverse().forEach(idx => {
      addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]);
    });

    // Remove vértices duplicados nas junções das bordas
    const uniqueBottomVertices = bottomVertices.filter((vertex, index, self) => {
      if (index === 0) return true;
      const prevX = newPositions[self[index - 1] * 3];
      const prevY = newPositions[self[index - 1] * 3 + 1];
      const currX = newPositions[vertex * 3];
      const currY = newPositions[vertex * 3 + 1];
      return Math.abs(prevX - currX) > 0.001 || Math.abs(prevY - currY) > 0.001;
    });

    // Cria os triângulos da base conectando ao centro
    for (let i = 0; i < uniqueBottomVertices.length; i++) {
      const current = uniqueBottomVertices[i];
      const next = uniqueBottomVertices[(i + 1) % uniqueBottomVertices.length];
      
      // Cria triângulo no sentido anti-horário para a face ficar para cima
      newIndices.push(
        centerIndex,
        next,
        current
      );
    }

    // Atualiza a geometria com os novos vértices e faces
    const finalGeometry = new THREE.BufferGeometry();
    finalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    finalGeometry.setIndex([...existingIndices, ...newIndices]);
    finalGeometry.computeVertexNormals();

    return finalGeometry;
  };

  const exportToSTL = () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;

    const exportMesh = new THREE.Mesh(
      exportGeometry,
      new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
    );
    exportMesh.rotation.x = -Math.PI / 2;

    const tempScene = new THREE.Scene();
    tempScene.add(exportMesh);

    const exporter = new STLExporter();
    const stlString = exporter.parse(tempScene);
    const blob = new Blob([stlString], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'modelo_3d.stl';
    link.click();
    URL.revokeObjectURL(url);
  };

  React.useImperativeHandle(ref, () => ({
    exportToSTL
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
  const [showExportInfo, setShowExportInfo] = React.useState(false);
  const heightMapRef = useRef<HeightMapRef>(null);

  useEffect(() => {
    if (imageUrl) {
      console.log('ThreeViewer - Carregando textura da imagem:', imageUrl);
      const loader = new THREE.TextureLoader();
      loader.load(
        imageUrl,
        (loadedTexture) => {
          console.log('ThreeViewer - Textura carregada com sucesso');
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

  const handleExport = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToSTL();
      setShowExportInfo(true);
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
          {isSteppedMode ? 'Visualização Suave' : 'Visualização em Camadas'}
        </button>
        <button
          className="preview-mode-button"
          onClick={() => setShowExportInfo(true)}
        >
          Informações de Fatiamento
        </button>
        {texture && (
          <button className="export-button" onClick={handleExport}>
            Exportar STL
          </button>
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
          baseHeight={baseHeight}
          baseThickness={baseThickness}
          onClose={() => setShowExportInfo(false)}
        />
      )}
    </div>
  );
};

export default ThreeViewer; 