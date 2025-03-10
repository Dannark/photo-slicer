import React, { useRef, useEffect, useState } from 'react';
import { LayerConfig } from './HeightControls';
import ColorPicker from './ColorPicker';

interface LayerColorSliderProps {
  layers: LayerConfig[];
  onChange: (layers: LayerConfig[]) => void;
  layerHeight: number;
  totalHeight: number;
}

const LayerColorSlider: React.FC<LayerColorSliderProps> = ({ 
  layers, 
  onChange, 
  layerHeight,
  totalHeight 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [hoveredY, setHoveredY] = useState<number | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [originalPositions, setOriginalPositions] = useState<number[] | null>(null);

  // Constantes
  const CANVAS_HEIGHT = 400;
  const CANVAS_WIDTH = 200;
  const SLIDER_START_Y = 30;
  const SLIDER_HEIGHT = CANVAS_HEIGHT - 60;
  const BUTTON_RADIUS = 8;
  const DRAG_HANDLE_HEIGHT = 10; // Altura da área de arrasto

  // Calcula o número total de camadas
  const totalLayers = Math.floor(totalHeight / layerHeight);
  
  // Calcula a altura de uma camada no canvas
  const layerPixelHeight = SLIDER_HEIGHT / totalLayers;

  // Calcula as posições das divisórias entre cores
  const getDividerPositions = () => {
    const positions: number[] = [];
    let currentY = SLIDER_START_Y;
    let accumulatedLayers = 0;

    layers.forEach((layer, index) => {
      if (index < layers.length - 1) {
        const nextAccumulatedLayers = Math.floor((layer.heightPercentage / 100) * totalLayers);
        const sectionHeight = (nextAccumulatedLayers - accumulatedLayers) * layerPixelHeight;
        currentY += sectionHeight;
        positions.push(currentY);
        accumulatedLayers = nextAccumulatedLayers;
      }
    });

    return positions;
  };

  const drawSlider = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpa o canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Desenha o fundo
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Desenha o slider principal
    let currentY = SLIDER_START_Y;
    let accumulatedLayers = 0;

    layers.forEach((layer, index) => {
      // Calcula o número de camadas para esta seção
      const nextAccumulatedLayers = index < layers.length - 1 
        ? Math.floor((layer.heightPercentage / 100) * totalLayers)
        : totalLayers;
      const layerCount = nextAccumulatedLayers - accumulatedLayers;
      const sectionHeight = layerCount * layerPixelHeight;

      // Desenha a seção da cor
      ctx.fillStyle = layer.color;
      ctx.fillRect(10, currentY, CANVAS_WIDTH - 40, sectionHeight);

      // Desenha a borda
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(10, currentY, CANVAS_WIDTH - 40, sectionHeight);

      // Desenha o botão de remover (se não for a última camada e houver mais de uma camada)
      if (layers.length > 1 && index < layers.length - 1) {
        const buttonX = CANVAS_WIDTH - 20;
        const buttonY = currentY + sectionHeight / 2;
        
        ctx.beginPath();
        ctx.arc(buttonX, buttonY, BUTTON_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = '#cc3333';
        ctx.fill();
        
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('×', buttonX, buttonY);
      }

      // Desenha a área de arrasto
      if (index < layers.length - 1) {
        const dividerY = currentY + sectionHeight;
        ctx.fillStyle = isDragging === index ? 'rgba(97, 218, 251, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        ctx.fillRect(10, dividerY - DRAG_HANDLE_HEIGHT/2, CANVAS_WIDTH - 40, DRAG_HANDLE_HEIGHT);
      }

      // Desenha o tooltip se o mouse estiver sobre esta seção
      if (hoveredY !== null && hoveredY >= currentY && hoveredY <= currentY + sectionHeight) {
        const startLayer = accumulatedLayers + 1;
        const endLayer = nextAccumulatedLayers;
        
        const tooltipText = `Camadas ${startLayer}-${endLayer}`;
        ctx.font = '12px Arial';
        const tooltipWidth = ctx.measureText(tooltipText).width + 20;
        
        // Desenha o fundo do tooltip
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, hoveredY - 20, tooltipWidth, 20);
        
        // Desenha o texto do tooltip
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, 20, hoveredY - 10);
      }

      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    });

    // Desenha o botão de adicionar no topo
    if (layers.length < 5) {
      ctx.beginPath();
      ctx.arc(CANVAS_WIDTH - 20, 15, BUTTON_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = '#4CAF50';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('+', CANVAS_WIDTH - 20, 15);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawSlider();
  }, [layers, hoveredY, isDragging]);

  const getCanvasCoordinates = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);
    setHoveredY(y);

    if (isDragging !== null && isDragging < layers.length - 1 && originalPositions !== null) {
      const newLayers = [...layers];
      
      // Calcula o número de camadas baseado na posição Y
      const relativeY = Math.max(SLIDER_START_Y, Math.min(y, SLIDER_START_Y + SLIDER_HEIGHT));
      const layerIndex = Math.floor((relativeY - SLIDER_START_Y) / layerPixelHeight);
      
      // Calcula a porcentagem da cor atual
      let currentPercentage = (layerIndex / totalLayers) * 100;

      // Limites baseados nas cores adjacentes
      const minPercentage = isDragging > 0 ? originalPositions[isDragging - 1] : 0;
      const maxPercentage = isDragging < layers.length - 1 
        ? originalPositions[isDragging + 1]
        : 100;
      
      // Aplica os limites
      currentPercentage = Math.max(minPercentage, Math.min(currentPercentage, maxPercentage));

      // Restaura todas as posições originais primeiro
      layers.forEach((_, index) => {
        newLayers[index].heightPercentage = originalPositions[index];
      });

      // Ajusta apenas a cor que está sendo arrastada
      newLayers[isDragging].heightPercentage = currentPercentage;

      onChange(newLayers);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const { x, y } = getCanvasCoordinates(e);

    // Verifica se clicou no botão de adicionar
    if (y <= 30 && Math.hypot(x - (CANVAS_WIDTH - 20), y - 15) <= BUTTON_RADIUS) {
      setShowColorPicker(true);
      return;
    }

    // Verifica se clicou em um botão de remover
    let currentY = SLIDER_START_Y;
    let accumulatedLayers = 0;

    for (let i = 0; i < layers.length - 1; i++) {
      const nextAccumulatedLayers = Math.floor((layers[i].heightPercentage / 100) * totalLayers);
      const sectionHeight = (nextAccumulatedLayers - accumulatedLayers) * layerPixelHeight;
      const buttonY = currentY + sectionHeight / 2;

      if (Math.hypot(x - (CANVAS_WIDTH - 20), y - buttonY) <= BUTTON_RADIUS) {
        if (layers.length > 1) {
          const newLayers = layers.filter((_, index) => index !== i);
          if (newLayers.length > 0) {
            newLayers[newLayers.length - 1].heightPercentage = 100;
          }
          onChange(newLayers);
        }
        return;
      }

      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    }

    // Verifica se clicou em uma área de arrasto
    const dividerPositions = getDividerPositions();
    const dividerIndex = dividerPositions.findIndex(pos => 
      Math.abs(y - pos) <= DRAG_HANDLE_HEIGHT/2
    );

    if (dividerIndex !== -1) {
      // Salva as posições originais de todas as cores após a que está sendo arrastada
      const positions = layers.map(layer => layer.heightPercentage);
      setOriginalPositions(positions);
      setIsDragging(dividerIndex);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
    setOriginalPositions(null);
  };

  const handleColorSelect = (color: string) => {
    if (layers.length < 5) {
      const defaultLayerSize = Math.floor(totalLayers / (layers.length + 1));
      const percentage = (defaultLayerSize / totalLayers) * 100;
      
      const newLayers = [...layers];
      newLayers[newLayers.length - 1].heightPercentage = percentage;
      newLayers.push({
        color,
        heightPercentage: 100
      });
      onChange(newLayers);
    }
    setShowColorPicker(false);
  };

  return (
    <div className="layer-color-slider" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ 
          cursor: isDragging !== null ? 'ns-resize' : 'default',
          width: '200px',
          height: '400px'
        }}
      />
      {showColorPicker && (
        <ColorPicker
          onColorSelect={handleColorSelect}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default LayerColorSlider; 