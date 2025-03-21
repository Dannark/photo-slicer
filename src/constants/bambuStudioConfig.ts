// Configuração padrão para Bambu Lab A1
export const defaultBambuA1Config: any = {
  // Configurações da Impressora
  printer_model: "Bambu Lab A1",
  printer_settings_id: "Bambu Lab A1 0.4 nozzle",
  print_settings_id: "0.08mm Extra Fine @BBL A1", //0.08mm By Photo-slicer
  // printer_variant: "0.4",
  // printer_notes: "",
  // printer_technology: "FFF",
  // printer_structure: "i3",
  // host_type: "octoprint",
  printable_area: ["0x0","256x0","256x256","0x256"],
  printable_height: "256",
  // bed_exclude_area: [],
  // bed_custom_model: "",
  // bed_custom_texture: "",
  // extruder_offset: ["0x0"],
  // extruder_colour: ["#018001"],
  // extruder_type: ["DirectDrive"],
  nozzle_diameter: ["0.4"],
  // nozzle_height: "4.76",
  // nozzle_type: "stainless_steel",
  // nozzle_volume: "92",
  
  // Configurações de Camadas
  layer_height: "0.08",
  // min_layer_height: ["0.08"],
  // max_layer_height: ["0.28"],
  initial_layer_print_height: "0.16",
  // initial_layer_line_width: "0.5",
  // initial_layer_flow_ratio: "1",
  // initial_layer_speed: "50",
  // initial_layer_infill_speed: "105",
  // initial_layer_acceleration: "500",
  // initial_layer_jerk: "9",
  // bottom_shell_layers: "7",
  // bottom_shell_thickness: "0",
  // top_shell_layers: "9",
  // top_shell_thickness: "0.8",
  
  // Configurações de Paredes
  wall_loops: "2",
  // wall_distribution_count: "1",
  // wall_filament: "1",
  // wall_generator: "classic",
  // wall_sequence: "inner wall/outer wall",
  outer_wall_line_width: "0.42",
  inner_wall_line_width: "0.45",
  // outer_wall_speed: "200",
  // inner_wall_speed: "350",
  // outer_wall_acceleration: "5000",
  // inner_wall_acceleration: "0",
  // outer_wall_jerk: "9",
  // inner_wall_jerk: "9",
  // min_bead_width: "85%",
  // min_feature_size: "25%",
  // wall_transition_angle: "10",
  // wall_transition_filter_deviation: "25%",
  // wall_transition_length: "100%",
  
  // Configurações de Preenchimento
  sparse_infill_density: "100%",
  sparse_infill_pattern: "zig-zag",
  sparse_infill_line_width: "0.45",
  // sparse_infill_speed: "450",
  // sparse_infill_acceleration: "100%",
  // sparse_infill_anchor: "400%",
  // sparse_infill_anchor_max: "20",
  // infill_combination: "0",
  // infill_direction: "45",
  // infill_jerk: "9",
  // infill_wall_overlap: "15%",
  // minimum_sparse_infill_area: "15",
  
  // Configurações de Superfície
  // top_surface_pattern: "monotonicline",
  // top_surface_line_width: "0.42",
  // top_surface_speed: "200",
  // top_surface_acceleration: "2000",
  // top_surface_jerk: "9",
  // bottom_surface_pattern: "monotonic",
  // internal_solid_infill_pattern: "zig-zag",
  // internal_solid_infill_line_width: "0.42",
  // internal_solid_infill_speed: "350",
  
  // Configurações de Filamento
  filament_settings_id: ["Generic PLA @BBL A1"],
  // default_filament_profile: ["Bambu PLA Basic @BBL A1"],
  filament_colour: ["#181c20", "#534d47", "#8d7b70", "#b7b2a9", "#e3e4de"],
  filament_type: ["PLA", "PLA", "PLA", "PLA"],
  // filament_density: ["1.24"],
  filament_diameter: ["1.75"],
  // filament_flow_ratio: ["0.98"],
  // print_flow_ratio: "1",
  
  // Configurações de Temperatura
  nozzle_temperature: ["220"],
  nozzle_temperature_initial_layer: ["220"],
  // nozzle_temperature_range_low: ["190"],
  // nozzle_temperature_range_high: ["240"],
  bed_temperature: ["65"],
  bed_temperature_initial_layer: ["65"],
  
  // Configurações de Ventilação
  fan_speed: ["70"],
  min_fan_speed: ["60"],
  max_fan_speed: ["80"],
  // fan_cooling_layer_time: ["80"],
  
  // Configurações de Retração
  // retraction_length: ["0.8"],
  // retraction_speed: ["30"],
  // retraction_minimum_travel: ["1"],
  // retract_before_wipe: ["0%"],
  // retract_when_changing_layer: ["1"],
  // wipe: ["1"],
  // wipe_distance: ["2"],
  // z_hop: ["0.4"],
  // z_hop_types: ["Auto Lift"],
  
  // Configurações de Suporte
  enable_support: "0",
  // support_type: "normal(auto)",
  // support_style: "default",
  // support_threshold_angle: "15",
  // support_on_build_plate_only: "0",
  // support_filament: "0",
  // support_interface_filament: "0",
  // support_angle: "0",
  // support_interface_pattern: "auto",
  // support_interface_loop_pattern: "0",
  // support_interface_not_for_body: "1",
  // support_expansion: "0",
  // support_speed: "150",
  // support_interface_speed: "80",
  // support_line_width: "0.42",
  // support_top_z_distance: "0.08",
  // support_bottom_z_distance: "0.08",
  // support_object_xy_distance: "0.35",
  // support_critical_regions_only: "0",
  // support_remove_small_overhang: "1",
  
  // Configurações de Velocidade e Aceleração
  // default_acceleration: "6000",
  // travel_speed: "700",
  // travel_speed_z: "0",
  // travel_jerk: "9",
  // default_jerk: "0",
  
  // Configurações de Qualidade
  // resolution: "0.012",
  // xy_hole_compensation: "0",
  // xy_contour_compensation: "0",
  // elefant_foot_compensation: "0.075",
  // precise_z_height: "0",
  
  // Configurações Avançadas
  // spiral_mode: "0",
  print_sequence: "by layer",
  gcode_flavor: "marlin",
  // machine_start_gcode: "",
  // machine_end_gcode: "",
  // seam_position: "aligned",
  version: "01.10.02.76",

  different_settings_to_system: [
    "initial_layer_print_height;layer_height",
    "",
    "",
    "",
    "",
    ""
  ],
  default_print_profile: "0.20mm Standard @BBL A1" //0.08mm Extra Fine @BBL A1 ou 0.20mm Standard @BBL A1
};
