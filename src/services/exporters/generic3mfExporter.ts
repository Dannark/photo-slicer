import * as THREE from 'three';
import JSZip from 'jszip';
import { LayerConfig } from '../../components/HeightControls';
import { createExtrudedGeometry } from './geometryUtils';

export const exportToGeneric3MF = async (
  geometry: THREE.BufferGeometry,
  layers: LayerConfig[],
  layerHeight: number,
  firstLayerHeight: number,
  baseThickness: number
): Promise<void> => {
  // Cria a geometria com paredes e base
  const extrudedGeometry = createExtrudedGeometry(geometry, baseThickness);

  // Cria o arquivo ZIP que conterá o 3MF
  const zip = new JSZip();

  // Gera o XML do modelo 3D usando apenas o namespace core do 3MF
  const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">Generic 3MF Exporter</metadata>
  <metadata name="CreationDate">${new Date().toISOString()}</metadata>
  <metadata name="Description">Multi-color 3D model</metadata>
  <metadata name="LayerHeight">${layerHeight}</metadata>
  <metadata name="FirstLayerHeight">${firstLayerHeight}</metadata>
  <metadata name="ColorChanges">${layers.map((layer, index) => 
    `Layer ${Math.floor((layer.heightPercentage / 100) * baseThickness / layerHeight)}: ${layer.color}`
  ).join('; ')}</metadata>
  
  <resources>
    <object id="1" type="model">
      <mesh>
        <vertices>
${generateVerticesXML(extrudedGeometry)}
        </vertices>
        <triangles>
${generateTrianglesXML(extrudedGeometry)}
        </triangles>
      </mesh>
    </object>
  </resources>
  
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0"/>
  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXML);

  // Adiciona o arquivo .rels padrão do 3MF
  const relsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;
  zip.file('_rels/.rels', relsContent);

  // Adiciona o arquivo Content_Types padrão do 3MF
  const contentTypesContent = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesContent);

  // Gera o arquivo .3mf
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo_3d.3mf';
  link.click();
  URL.revokeObjectURL(url);
};

const generateVerticesXML = (geometry: THREE.BufferGeometry): string => {
  const positions = geometry.getAttribute('position').array;
  let xml = '';
  
  for (let i = 0; i < positions.length; i += 3) {
    xml += `          <vertex x="${positions[i]}" y="${positions[i + 1]}" z="${positions[i + 2]}"/>\n`;
  }
  
  return xml;
};

const generateTrianglesXML = (geometry: THREE.BufferGeometry): string => {
  const indices = geometry.index?.array;
  let xml = '';
  
  if (indices) {
    for (let i = 0; i < indices.length; i += 3) {
      xml += `          <triangle v1="${indices[i]}" v2="${indices[i + 1]}" v3="${indices[i + 2]}"/>\n`;
    }
  }
  
  return xml;
};
