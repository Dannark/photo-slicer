import * as THREE from 'three';
import JSZip from 'jszip';
import { LayerConfig } from '../../components/HeightControls';
import { createExtrudedGeometry } from './geometryUtils';

interface BambuConfig {
  print_settings: {
    layer_height: number;
    first_layer_height: number;
    filament_changes: {
      layer: number;
      color: string;
    }[];
  };
}

export const exportToBambu3MF = async (
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

  // Gera o XML do modelo 3D
  const modelXML = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02" xmlns:slic3r="http://schemas.slic3r.org/3mf/2017/06" xmlns:p="http://schemas.microsoft.com/3dmanufacturing/production/2015/06" xmlns:b="http://schemas.bambulab.com/3mf/2021/11">
  <metadata name="Application">BambuStudio-01.08.00.53</metadata>
  <metadata name="CreationDate">2024-02-19</metadata>
  <metadata name="ModificationDate">2024-02-19</metadata>
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
    <item objectid="1" transform="1 0 0 0 1 0 0 0 1 0 0 0" printable="1">
      <metadata name="name">modelo_3d</metadata>
      <metadata name="extruder">0</metadata>
    </item>
  </build>
</model>`;

  zip.file('3D/3dmodel.model', modelXML);

  // Gera a configuração do Bambu Lab
  const config = {
    print_settings: {
      layer_height: layerHeight,
      first_layer_height: firstLayerHeight,
      printer_model: "Bambu Lab X1 Carbon",
      printer_variant: "0.4",
      nozzle_diameter: 0.4,
      bed_temperature: 60,
      bed_temperature_initial_layer: 60,
      max_layer_height: 0.28,
      min_layer_height: 0.08,
      filament_settings_id: ["Bambu PLA Basic @BBL X1C 0.4 nozzle"],
      printer_settings_id: "Bambu X1 Carbon 0.4 nozzle",
      support_material: false,
      support_material_auto: false,
      support_material_threshold: 0,
      support_material_buildplate_only: false,
      support_material_angle: 0,
      support_material_pattern: "rectilinear",
      support_material_interface_pattern: "rectilinear",
      support_material_spacing: 2.5,
      support_material_bottom_spacing: 0,
      support_material_top_spacing: 0,
      support_material_interface_spacing: 0,
      support_material_angle_resolution: 0,
      support_material_pattern_resolution: 0,
      support_material_pattern_spacing: 2.5,
      support_material_interface_layers: 3,
      support_material_interface_contact_loops: false,
      support_material_contact_distance_type: "plane",
      support_material_contact_distance_top: 0.2,
      support_material_contact_distance_bottom: 0.2,
      support_material_xy_spacing: 50,
      support_material_synchronize_layers: false,
      support_material_threshold_bridge: 0,
      support_material_enforce_layers: 0,
      dont_support_bridges: true,
      filament_colour: layers.map(layer => layer.color),
      filament_changes: layers.map((layer, index) => ({
        layer: Math.floor(layer.heightPercentage * layerHeight),
        color: layer.color,
        extruder: index
      })),
      machine_limits_usage: "emit_to_gcode",
      machine_max_acceleration_e: [5000, 5000],
      machine_max_acceleration_extruding: [20000, 20000],
      machine_max_acceleration_retracting: [5000, 5000],
      machine_max_acceleration_travel: [9000, 9000],
      machine_max_acceleration_x: [20000, 20000],
      machine_max_acceleration_y: [20000, 20000],
      machine_max_acceleration_z: [500, 500],
      machine_max_speed_e: [120, 120],
      machine_max_speed_x: [500, 500],
      machine_max_speed_y: [500, 500],
      machine_max_speed_z: [12, 12],
      machine_max_jerk_e: [2.5, 2.5],
      machine_max_jerk_x: [9, 9],
      machine_max_jerk_y: [9, 9],
      machine_max_jerk_z: [0.2, 0.2],
      machine_min_extruding_rate: [0, 0],
      machine_min_travel_rate: [0, 0]
    }
  };

  zip.file('Metadata/model_settings.config', JSON.stringify(config, null, 2));

  // Adiciona o arquivo .rels com namespace específico do Bambu Lab
  const relsContent = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
  <Relationship Target="/Metadata/model_settings.config" Id="rel1" Type="http://schemas.bambulab.com/package/2021/bambu-model-settings"/>
  <Relationship Target="/Metadata/plate_1.config" Id="rel2" Type="http://schemas.bambulab.com/package/2021/plate-settings"/>
</Relationships>`;
  zip.file('_rels/.rels', relsContent);

  // Adiciona configurações da placa (plate)
  const plateConfig = {
    plate_settings: {
      name: "Plate 1",
      print_sequence: "by_layer",
      objects: [{
        id: 1,
        name: "modelo_3d",
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scaling_factor: 1,
        extruder: "0"
      }]
    }
  };
  zip.file('Metadata/plate_1.config', JSON.stringify(plateConfig, null, 2));

  // Adiciona o arquivo Content_Types com tipos específicos do Bambu Lab
  const contentTypesContent = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
  <Default Extension="config" ContentType="application/vnd.bambulab.model-settings+xml"/>
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
