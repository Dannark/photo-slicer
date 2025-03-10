import React, { useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { LayerConfig } from './HeightControls';

// Constantes de dimensão
const MODEL_WIDTH = 100;  // 100mm = 10cm
const MODEL_HEIGHT = 100; // 100mm = 10cm
const RESOLUTION = 200;   // Resolução da malha

interface ThreeViewerProps {
  imageUrl: string | null;
  baseHeight: number;
  layers: LayerConfig[];
}

interface HeightMapRef {
  exportToSTL: () => void;
}

const HeightMap = React.forwardRef<HeightMapRef, {
  texture: THREE.Texture;
  baseHeight: number;
  layers: LayerConfig[];
}>(({ texture, baseHeight, layers }, ref) => {
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
    for (let i = 0; i < positions.length; i += 3) {
      const x = (positions[i] + MODEL_WIDTH/2) / MODEL_WIDTH; // Normaliza para 0,1
      const y = (positions[i + 1] + MODEL_HEIGHT/2) / MODEL_HEIGHT;

      // Encontra o pixel correspondente na imagem
      const pixelX = Math.floor(x * (canvas.width - 1));
      const pixelY = Math.floor(y * (canvas.height - 1));
      const pixelIndex = (pixelY * canvas.width + pixelX) * 4;

      // Usa a média RGB como altura (convertendo para escala de cinza)
      const height = (pixels[pixelIndex] + pixels[pixelIndex + 1] + pixels[pixelIndex + 2]) / (3 * 255) * baseHeight;
      positions[i + 2] = height;
    }

    geometry.computeVertexNormals();
    return geometry;
  };

  const exportToSTL = () => {
    const exportGeometry = createGeometryWithHeight();
    if (!exportGeometry) return;

    const exportMesh = new THREE.Mesh(
      exportGeometry,
      new THREE.MeshStandardMaterial()
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

const ThreeViewer: React.FC<ThreeViewerProps> = ({ imageUrl, baseHeight, layers }) => {
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
              layers={layers} 
            />
          )}
        </Canvas>
      </div>
    </div>
  );
};

export default ThreeViewer; 