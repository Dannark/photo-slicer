import * as THREE from 'three';
import JSZip from 'jszip';
import { LayerConfig } from '../../components/HeightControls';
import { createExtrudedGeometry } from './geometryUtils';

const generateThumbnailFromImage = async (imageData: string): Promise<string> => {
  // Cria um canvas temporário
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const img = new Image();

  // Configura o tamanho do canvas para 256x256 (tamanho padrão para thumbnails)
  canvas.width = 256;
  canvas.height = 256;

  return new Promise<string>((resolve) => {
    img.onload = () => {
      // Pinta o fundo branco
      ctx.fillStyle = 'rgba(255, 255, 255, 0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calcula as dimensões para manter a proporção
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const width = img.width;
      const height = img.height;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;
      console.log({x, y, width, height, scale});

      // Desenha a imagem centralizada
      ctx.drawImage(img, x, y, width, height);

      // Converte para PNG e retorna apenas os dados base64
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };

    // Carrega a imagem
    img.src = imageData;
  });
};

export const exportToPrusa3MF = async (
  geometry: THREE.BufferGeometry,
  layers: LayerConfig[],
  layerHeight: number,
  firstLayerHeight: number,
  baseThickness: number,
  originalImage: string // Novo parâmetro para a imagem original
): Promise<void> => {
  // Cria a geometria com paredes e base
  const extrudedGeometry = createExtrudedGeometry(geometry, baseThickness);

  // Cria o arquivo ZIP que conterá o 3MF
  const zip = new JSZip();

  // Gera uma thumbnail usando a imagem original
  const thumbnailData = await generateThumbnailFromImage(originalImage);
  zip.file('Metadata/thumbnail.png', thumbnailData, { base64: true });

  // Gera o XML do modelo 3D com namespaces do PrusaSlicer
  const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3r="http://schemas.slic3r.org/3mf/2017/06">
  <metadata name="Application">PrusaSlicer</metadata>
  <metadata name="CreationDate">${new Date().toISOString()}</metadata>
  <metadata name="Description">Modelo gerado pelo Photo Slicer</metadata>
  
  <slic3r:metadata version="1.0">
    <layer_height>${layerHeight}</layer_height>
    <first_layer_height>${firstLayerHeight}</first_layer_height>
    <print_settings>
      <layer_height>${layerHeight}</layer_height>
      <first_layer_height>${firstLayerHeight}</first_layer_height>
      <perimeters>3</perimeters>
      <support_material>0</support_material>
      <gcode_flavor>marlin</gcode_flavor>
      <infill_density>20%</infill_density>
    </print_settings>
    <filament_settings>
      <filament_type>PLA</filament_type>
      <temperature>210</temperature>
      <bed_temperature>60</bed_temperature>
      <filament_colour>${layers[0].color}</filament_colour>
    </filament_settings>
    <printer_settings>
      <printer_model>Original Prusa i3 MK3S</printer_model>
      <nozzle_diameter>0.4</nozzle_diameter>
      <bed_shape>0x0,250x0,250x210,0x210</bed_shape>
    </printer_settings>
    <config>
      <layer_height>${layerHeight}</layer_height>
      <first_layer_height>${firstLayerHeight}</first_layer_height>
      <color_change_gcode>M600</color_change_gcode>
      ${layers.map((layer, index) => {
        if (index === 0) return '';
        const heightInMM = (layer.heightPercentage / 100) * baseThickness;
        const layerNumber = Math.floor(heightInMM / layerHeight);
        return `<colorchange_layers>${layerNumber}</colorchange_layers>`;
      }).filter(Boolean).join('\n      ')}
    </config>
  </slic3r:metadata>

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

  // Adiciona o arquivo .rels com referência à thumbnail
  const relsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel-1" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  <Relationship Target="/Metadata/thumbnail.png" Id="rel-2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>
</Relationships>`;
  zip.file('_rels/.rels', relsContent);

  // Adiciona o arquivo Content_Types com suporte a PNG
  const contentTypesContent = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="png" ContentType="image/png"/>
</Types>`;
  zip.file('[Content_Types].xml', contentTypesContent);

  // Gera o arquivo .3mf usando a nomenclatura correta
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modelo.build.3mf';
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
