import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { LayerConfig } from './HeightControls';

// Constantes de dimensão
const MODEL_WIDTH = 100;  // 100mm = 10cm
const MODEL_HEIGHT = 100; // 100mm = 10cm
const RESOLUTION = 200;   // Resolução da malha

interface ThreeViewerProps {
  imageUrl: string | null;
  baseHeight: number;
  baseThickness: number;
  layers: LayerConfig[];
}

interface HeightMapRef {
  exportToSTL: () => void;
}

const HeightMap = React.forwardRef<HeightMapRef, {
  texture: THREE.Texture;
  baseHeight: number;
  baseThickness: number;
  layers: LayerConfig[];
}>(({ texture, baseHeight, baseThickness, layers }, ref) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { scene } = useThree();

  // Shader personalizado para aplicar as cores baseado na altura
  const shader = {
    uniforms: {
      heightMap: { value: texture },
      baseHeight: { value: baseHeight },
      layerColors: { value: layers.map(l => new THREE.Color(l.color)) },
      layerHeights: { value: layers.map(l => l.heightPercentage / 100) },
    },
    vertexShader: `
      uniform sampler2D heightMap;
      uniform float baseHeight;
      varying float vHeight;
      
      void main() {
        vec4 heightColor = texture2D(heightMap, uv);
        float height = heightColor.r * baseHeight;
        vHeight = height / baseHeight;
        
        vec3 pos = position;
        pos.z += height;
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 layerColors[4];
      uniform float layerHeights[4];
      varying float vHeight;
      
      void main() {
        vec3 color = layerColors[0];
        
        for(int i = 1; i < 4; i++) {
          if(vHeight > layerHeights[i-1]) {
            color = layerColors[i];
          }
        }
        
        gl_FragColor = vec4(color, 1.0);
      }
    `
  };

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.baseHeight.value = baseHeight;
      materialRef.current.uniforms.layerColors.value = layers.map(l => new THREE.Color(l.color));
      materialRef.current.uniforms.layerHeights.value = layers.map(l => l.heightPercentage / 100);
    }
  }, [baseHeight, layers]);

  const createGeometryWithHeight = () => {
    // Cria a geometria inicial
    const geometry = new THREE.PlaneGeometry(MODEL_WIDTH, MODEL_HEIGHT, RESOLUTION - 1, RESOLUTION - 1);
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

      const pixelX = Math.floor((x + MODEL_WIDTH/2) / MODEL_WIDTH * (canvas.width - 1));
      const pixelY = Math.floor((y + MODEL_HEIGHT/2) / MODEL_HEIGHT * (canvas.width - 1));
      const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

      const height = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / (3 * 255) * baseHeight;
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
      <planeGeometry args={[MODEL_WIDTH, MODEL_HEIGHT, RESOLUTION - 1, RESOLUTION - 1]} />
      <shaderMaterial ref={materialRef} args={[shader]} />
    </mesh>
  );
});

const ThreeViewer: React.FC<ThreeViewerProps> = ({ imageUrl, baseHeight, baseThickness, layers }) => {
  const [texture, setTexture] = React.useState<THREE.Texture | null>(null);
  const heightMapRef = useRef<HeightMapRef>(null);

  useEffect(() => {
    if (imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(imageUrl, (loadedTexture) => {
        setTexture(loadedTexture);
      });
    }
  }, [imageUrl]);

  const handleExport = () => {
    if (heightMapRef.current) {
      heightMapRef.current.exportToSTL();
    }
  };

  return (
    <div className="three-viewer">
      <div className="viewer-controls">
        <button onClick={handleExport} className="export-button">
          Exportar STL
        </button>
      </div>
      <div style={{ width: '100%', height: '500px' }}>
        <Canvas camera={{ position: [0, 50, 100], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[50, 50, 50]} />
          <OrbitControls />
          {texture && (
            <HeightMap 
              ref={heightMapRef}
              texture={texture} 
              baseHeight={baseHeight} 
              baseThickness={baseThickness} 
              layers={layers} 
            />
          )}
        </Canvas>
      </div>
    </div>
  );
};

export default ThreeViewer; 