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
  console.log('Parâmetros recebidos:', {
    layerHeight,
    firstLayerHeight,
    baseThickness,
    layersCount: layers.length
  });

  // Cria a geometria com paredes e base
  const extrudedGeometry = createExtrudedGeometry(geometry, baseThickness);

  // Calcula as dimensões do modelo
  extrudedGeometry.computeBoundingBox();
  const boundingBox = extrudedGeometry.boundingBox!;
  const modelWidth = boundingBox.max.x - boundingBox.min.x;
  const modelDepth = boundingBox.max.y - boundingBox.min.y;
  const modelHeight = boundingBox.max.z - boundingBox.min.z;
  
  // Calcula o número real de camadas baseado na altura do modelo
  const totalLayers = Math.ceil((modelHeight - firstLayerHeight) / layerHeight) + 1;
  
  console.log('Dimensões calculadas:', {
    modelWidth,
    modelDepth,
    modelHeight,
    layerCalculations: {
      firstLayerHeight,
      layerHeight,
      colorLayers: layers.length,
      totalLayers,
      expectedHeight: firstLayerHeight + (layerHeight * (totalLayers - 1))
    },
    boundingBox: {
      min: boundingBox.min.toArray(),
      max: boundingBox.max.toArray()
    }
  });

  // Calcula a posição central na mesa (com padding de 10mm)
  const padding = 10;
  const centerX = modelWidth/2 + padding;
  const centerY = modelDepth/2 + padding;
  const centerZ = modelHeight/2;

  console.log('Dimensões do modelo:', { modelWidth, modelDepth, modelHeight, centerX, centerY, centerZ });

  // Cria o arquivo ZIP que conterá o 3MF
  const zip = new JSZip();

  // Gera uma thumbnail usando a imagem original
  const thumbnailData = await generateThumbnailFromImage(originalImage);
  zip.file('Metadata/thumbnail.png', thumbnailData, { base64: true });

  // Gera o arquivo Slic3r_PE.config
  const slic3rConfig = `; generated by Photo Slicer v0.1.2
; layer_height = ${layerHeight}
; first_layer_height = ${firstLayerHeight}
; fill_density = 100%
; fill_pattern = rectilinear
; filament_colour = ${layers[0].color}
; color_change_gcode = M600`;

  zip.file('Metadata/Slic3r_PE.config', slic3rConfig);

  // Gera o arquivo Slic3r_PE_model.config com a posição correta
  const modelConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
 <object id="1" instances_count="1">
  <metadata type="object" key="name" value="modelo.build"/>
  <volume firstid="0" lastid="242790">
   <metadata type="volume" key="name" value="modelo.build"/>
   <metadata type="volume" key="volume_type" value="ModelPart"/>
   <metadata type="volume" key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
   <metadata type="volume" key="source_file" value="modelo.build.3mf"/>
   <metadata type="volume" key="source_object_id" value="0"/>
   <metadata type="volume" key="source_volume_id" value="0"/>
   <metadata type="volume" key="source_offset_x" value="0"/>
   <metadata type="volume" key="source_offset_y" value="0"/>
   <metadata type="volume" key="source_offset_z" value="${modelHeight/2}"/>
   <mesh edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
  </volume>
 </object>
</config>`;

  zip.file('Metadata/Slic3r_PE_model.config', modelConfig);

  // Calcula as alturas de troca de cor e gera o XML
  const colorChanges = layers.slice(1).map((layer, index) => {
    // Calcula em qual camada ocorre a troca baseado na porcentagem
    const heightPercentage = layer.heightPercentage / 100;
    const targetLayer = Math.round(heightPercentage * totalLayers);
    
    // Calcula a altura real em mm onde ocorre a troca
    // Primeira camada tem altura diferente
    const height = firstLayerHeight + (layerHeight * (targetLayer - 1));
    const print_z = height.toFixed(8);

    console.log('Calculando altura da camada:', {
      heightPercentage,
      totalLayers,
      targetLayer,
      height,
      print_z,
      layer
    });
    
    return `  <code print_z="${print_z}" type="0" extruder="1" color="${layer.color}" extra="" gcode="M600"/>`;
  });

  const customGcodeXML = `<?xml version="1.0" encoding="UTF-8"?>
<custom_gcodes_per_print_z bed_idx="0">
${colorChanges.join('\n')}
  <mode value="SingleExtruder"/>
</custom_gcodes_per_print_z>`;

  zip.file('Metadata/Prusa_Slicer_custom_gcode_per_print_z.xml', customGcodeXML);

  // Gera o XML do modelo 3D com namespaces do PrusaSlicer
  const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
  <metadata name="Application">PrusaSlicer</metadata>
  <metadata name="CreationDate">${new Date().toISOString()}</metadata>
  <metadata name="Description">Modelo gerado pelo Photo Slicer</metadata>
  
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
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 ${centerX} ${centerY} ${centerZ}" printable="1"/>
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