import * as THREE from 'three';
import JSZip from 'jszip';
import { LayerConfig } from '../../components/HeightControls';
import { createExtrudedGeometry } from './geometryUtils';
import { defaultBambuA1Config } from '../../constants/bambuStudioConfig';
import { defaultFilamentSettings } from '../../constants/bambuStudioFilamentConfig';

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

      // Desenha a imagem centralizada
      ctx.drawImage(img, x, y, width, height);

      // Converte para PNG e retorna apenas os dados base64
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };

    // Carrega a imagem
    img.src = imageData;
  });
};

export const exportToBambu3MF = async (
  geometry: THREE.BufferGeometry,
  layers: LayerConfig[],
  layerHeight: number,
  firstLayerHeight: number,
  baseThickness: number,
  originalImage: string
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
  
  // Gera as thumbnails
  const thumbnailData = await generateThumbnailFromImage(originalImage);
  
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
    }
  });

  // Cria o arquivo ZIP que conterá o 3MF
  const zip = new JSZip();

  // Adiciona as thumbnails
  zip.file('Metadata/plate_1.png', thumbnailData, { base64: true });
  zip.file('Metadata/plate_no_light_1.png', thumbnailData, { base64: true });
  zip.file('Metadata/top_1.png', thumbnailData, { base64: true });
  zip.file('Metadata/pick_1.png', thumbnailData, { base64: true });

  // Gera o arquivo plate_1.config com as configurações da placa de impressão
  const plateConfig = {
    bbox_all: ["0", "0", "0", modelWidth.toString(), modelDepth.toString(), modelHeight.toString()],
    bbox_objects: [{
      area: (modelWidth * modelDepth).toString(),
      bbox: ["0", "0", "0", modelWidth.toString(), modelDepth.toString(), modelHeight.toString()],
      layer_height: layerHeight.toString(),
      name: "modelo_3d"
    }],
    bed_type: "Bambu Cool Plate",
    filament_colors: layers.map(layer => layer.color),
    filament_ids: ["GFB00"],
    first_extruder: "1",
    is_seq_print: "0",
    nozzle_diameter: defaultBambuA1Config.nozzle_diameter,
    version: "1"
  };

  zip.file('Metadata/plate_1.config', JSON.stringify(plateConfig));

  // Gera o XML do modelo 3D com namespaces do Bambu Lab
  const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3r="http://schemas.slic3r.org/3mf/2017/06" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" xmlns:b="http://schemas.bambulab.com/3mf/2021/11">
  <metadata name="Application">BambuStudio-01.10.02.76</metadata>
  <metadata name="CreationDate">${new Date().toISOString().split('T')[0]}</metadata>
  <metadata name="ModificationDate">${new Date().toISOString().split('T')[0]}</metadata>
  <b:metadata key="ams_mapping">1</b:metadata>
  <b:metadata key="initial_extruder">0</b:metadata>
  <b:metadata key="gcode_flavor">bambu</b:metadata>
  <resources>
    <b:plate>
      <b:metadata key="plate_index">1</b:metadata>
      <b:metadata key="extruder_clearance">0</b:metadata>
      <b:metadata key="is_center_origin">0</b:metadata>
    </b:plate>
    <object id="1" type="model" pid="1">
      <mesh>
        <vertices>
${generateVerticesXML(extrudedGeometry)}
        </vertices>
        <triangles>
${generateTrianglesXML(extrudedGeometry)}
        </triangles>
      </mesh>
      <components/>
    </object>
  </resources>
  <build>
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 128 128 ${modelHeight/2}" printable="1">
      <metadata name="name">modelo_3d</metadata>
      <metadata name="extruder">0</metadata>
    </item>
  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXML);

  // Gera o arquivo slice_info.config (versão simplificada)
  const sliceInfoConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <header>
    <header_item key="X-BBL-Client-Type" value="slicer"/>
    <header_item key="X-BBL-Client-Version" value="01.10.02.76"/>
  </header>
</config>`;

  zip.file('Metadata/slice_info.config', sliceInfoConfig);

  // Gera o arquivo project_settings.config com todas as configurações
  const projectSettingsConfig = {
    ...defaultBambuA1Config,
    layer_height: layerHeight.toString(),
    initial_layer_print_height: firstLayerHeight.toString(),
    filament_colour: layers.map(layer => layer.color)
  };

  zip.file('Metadata/project_settings.config', JSON.stringify(projectSettingsConfig));

  // Gera o arquivo filament_settings_1.config com as configurações do filamento
  const filamentSettingsConfig = {
    ...defaultFilamentSettings,
    filament_settings_id: layers.map(() => "(Photo Slicer)"),
    filament_type: layers.map(() => "PLA"),
    filament_colour: layers.map(layer => layer.color)
  };

  zip.file('Metadata/filament_settings_1.config', JSON.stringify(filamentSettingsConfig));

  // Gera o arquivo model_settings.config com as configurações do Bambu
  const modelSettingsConfig = `<?xml version="1.0" encoding="UTF-8"?>
<config>
  <object id="1">
    <metadata key="name" value="modelo_3d"/>
    <metadata key="extruder" value="1"/>
    <metadata face_count="${extrudedGeometry.index?.count || 0}"/>
    <metadata key="initial_layer_height" value="${firstLayerHeight}"/>
    <metadata key="layer_height" value="${layerHeight}"/>
    <metadata key="wall_loops" value="${defaultBambuA1Config.wall_loops}"/>
    <metadata key="outer_wall_line_width" value="${defaultBambuA1Config.outer_wall_line_width}"/>
    <metadata key="inner_wall_line_width" value="${defaultBambuA1Config.inner_wall_line_width}"/>
    <metadata key="infill_density" value="${defaultBambuA1Config.sparse_infill_density}"/>
    <metadata key="infill_pattern" value="${defaultBambuA1Config.sparse_infill_pattern}"/>
    <metadata key="nozzle_temperature" value="${defaultBambuA1Config.nozzle_temperature[0]}"/>
    <metadata key="nozzle_temperature_initial_layer" value="${defaultBambuA1Config.nozzle_temperature_initial_layer[0]}"/>
    <metadata key="bed_temperature" value="${defaultBambuA1Config.bed_temperature[0]}"/>
    <metadata key="bed_temperature_initial_layer" value="${defaultBambuA1Config.bed_temperature_initial_layer[0]}"/>
    <metadata key="fan_speed" value="${defaultBambuA1Config.fan_speed[0]}"/>
    <metadata key="min_fan_speed" value="${defaultBambuA1Config.min_fan_speed[0]}"/>
    <metadata key="max_fan_speed" value="${defaultBambuA1Config.max_fan_speed[0]}"/>
    <part id="1" subtype="normal_part">
      <metadata key="name" value="modelo_3d"/>
      <metadata key="matrix" value="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1"/>
      <metadata key="source_file" value="modelo_3d.3mf"/>
      <metadata key="source_object_id" value="0"/>
      <metadata key="source_volume_id" value="0"/>
      <metadata key="source_offset_x" value="0"/>
      <metadata key="source_offset_y" value="0"/>
      <metadata key="source_offset_z" value="${modelHeight/2}"/>
      <mesh_stat face_count="${extrudedGeometry.index?.count || 0}" edges_fixed="0" degenerate_facets="0" facets_removed="0" facets_reversed="0" backwards_edges="0"/>
    </part>
  </object>
  <plate>
    <metadata key="plater_id" value="1"/>
    <metadata key="plater_name" value=""/>
    <metadata key="locked" value="false"/>
    <metadata key="thumbnail_file" value="Metadata/plate_1.png"/>
    <metadata key="thumbnail_no_light_file" value="Metadata/plate_no_light_1.png"/>
    <metadata key="top_file" value="Metadata/top_1.png"/>
    <metadata key="pick_file" value="Metadata/pick_1.png"/>
    <model_instance>
      <metadata key="object_id" value="1"/>
      <metadata key="instance_id" value="0"/>
      <metadata key="identify_id" value="1"/>
    </model_instance>
  </plate>
  <assemble>
   <assemble_item object_id="1" instance_id="0" transform="1 0 0 0 1 0 0 0 1 128 128 ${modelHeight/2}" offset="0 0 0" />
  </assemble>
</config>`;

  zip.file('Metadata/model_settings.config', modelSettingsConfig);

  // Gera o arquivo cut_information.xml
  const cutInformationXML = `<?xml version="1.0" encoding="utf-8"?>
<objects>
 <object id="1">
  <cut_id id="0" check_sum="1" connectors_cnt="0"/>
 </object>
</objects>`;

  zip.file('Metadata/cut_information.xml', cutInformationXML);

  // Calcula as alturas de troca de cor e gera o XML
  const colorChanges = layers.map((layer, index) => {
    if (index === 0) return null; // A primeira cor é a base, não precisa de troca

    // Calcula o número total de camadas usando a mesma lógica do LayerColorSlider
    const baseLayers = Math.floor(baseThickness / layerHeight);
    const normalLayers = totalLayers - baseLayers

    // Usa a mesma lógica do ExportInfo.tsx
    const previousEnd = Math.floor((layers[index - 1].heightPercentage / 100) * normalLayers);
    const baseStart = previousEnd + 1;
    const start = baseStart + baseLayers;

    // Calcula a altura real em mm onde ocorre a troca
    const height = firstLayerHeight + (layerHeight * (start - 1));
    
    // O extruder começa em 2 pois 1 é a cor base
    return `<layer top_z="${height.toFixed(8)}" type="2" extruder="${index + 1}" color="${layer.color}" extra="" gcode="tool_change"/>`;
  }).filter(Boolean);

  // Gera o arquivo custom_gcode_per_layer.xml
  const customGcodeXML = `<?xml version="1.0" encoding="utf-8"?>
<custom_gcodes_per_layer>
<plate>
<plate_info id="1"/>
${colorChanges.join('\n')}
<mode value="MultiAsSingle"/>
</plate>
</custom_gcodes_per_layer>`;

  zip.file('Metadata/custom_gcode_per_layer.xml', customGcodeXML);

  // Adiciona o arquivo .rels
  const relsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  <Relationship Target="/Metadata/model_settings.config" Id="rel1" Type="http://schemas.bambulab.com/package/2021/bambu-model-settings"/>
  <Relationship Target="/Metadata/plate_1.config" Id="rel2" Type="http://schemas.bambulab.com/package/2021/plate-settings"/>
  <Relationship Target="/Metadata/plate_1.png" Id="rel3" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail"/>
  <Relationship Target="/Metadata/plate_no_light_1.png" Id="rel4" Type="http://schemas.bambulab.com/package/2021/plate-thumbnail-no-light"/>
  <Relationship Target="/Metadata/top_1.png" Id="rel5" Type="http://schemas.bambulab.com/package/2021/plate-thumbnail-top"/>
  <Relationship Target="/Metadata/pick_1.png" Id="rel6" Type="http://schemas.bambulab.com/package/2021/plate-thumbnail-pick"/>
</Relationships>`;
  zip.file('_rels/.rels', relsContent);

  // Adiciona o arquivo Content_Types
  const contentTypesContent = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/vnd.bambulab.model-settings+xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/Metadata/plate_1.config" ContentType="application/vnd.bambulab.plate-settings+xml"/>
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
