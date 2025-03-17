import * as THREE from 'three';
import { STLExporter } from 'three-stdlib';
import { createExtrudedGeometry } from './geometryUtils';

export const exportToSTL = (geometry: THREE.BufferGeometry, baseThickness: number): void => {
  // Cria a geometria com paredes e base
  const extrudedGeometry = createExtrudedGeometry(geometry, baseThickness);

  const exportMesh = new THREE.Mesh(
    extrudedGeometry,
    new THREE.MeshStandardMaterial({ side: THREE.DoubleSide })
  );

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
