import React, { useRef, useEffect, useState } from 'react';
import { LayerConfig } from './HeightControls';
import ColorPicker from './ColorPicker';
import PatternSelector from './PatternSelector';

interface LayerColorSliderProps {
  layers: LayerConfig[];
  onChange: (layers: LayerConfig[]) => void;
  layerHeight: number;
  totalHeight: number;
  imageData?: ImageData;
  baseThickness: number;
}

const LayerColorSlider: React.FC<LayerColorSliderProps> = ({ 
  layers, 
  onChange, 
  layerHeight,
  totalHeight,
  imageData,
  baseThickness
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<number | null>(null);
  const [hoveredY, setHoveredY] = useState<number | null>(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [originalPositions, setOriginalPositions] = useState<number[] | null>(null);
  const [selectedDividerIndex, setSelectedDividerIndex] = useState<number | null>(null);
  const [isOverDivider, setIsOverDivider] = useState(false);
  const [lastValidLayer, setLastValidLayer] = useState<number | null>(null);
  const [isAddingNewColor, setIsAddingNewColor] = useState(false);

  // Constantes
  const CANVAS_HEIGHT = 400;
  const CANVAS_WIDTH = 200;
  const SLIDER_START_Y = 30;
  const SLIDER_HEIGHT = CANVAS_HEIGHT - 60;
  const BUTTON_RADIUS = 8;
  const DRAG_HANDLE_HEIGHT = 10; // Altura da área de arrasto
  const COLUMN_WIDTH = (CANVAS_WIDTH - 50) / 2; // 50px para espaço entre colunas e bordas
  const LEFT_COLUMN_X = 10;
  const RIGHT_COLUMN_X = CANVAS_WIDTH - COLUMN_WIDTH - 10;
  const CENTER_X = LEFT_COLUMN_X + COLUMN_WIDTH + 15; // Ponto central entre as colunas

  // Calcula o número total de camadas
  const firstLayerHeight = layerHeight * 2;
  const baseLayers = Math.floor(baseThickness / layerHeight);
  
  // Calcula o número de camadas normais (excluindo a primeira camada que é dupla)
  const normalLayers = Math.floor((totalHeight - firstLayerHeight - baseThickness) / layerHeight);
  const totalLayers = normalLayers + baseLayers + 1; // +1 para a primeira camada
  
  // Calcula a altura de uma camada no canvas
  const layerPixelHeight = SLIDER_HEIGHT / totalLayers;

  // Calcula as posições das divisórias entre cores
  const getDividerPositions = (): number[] => {
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

  // Função para calcular a cor intermediária
  const interpolateColor = (color1: string, color2: string, factor: number): string => {
    // Remove o # se existir
    const c1 = color1.replace('#', '');
    const c2 = color2.replace('#', '');
    
    // Converte hex para RGB
    const r1 = parseInt(c1.substr(0, 2), 16);
    const g1 = parseInt(c1.substr(2, 2), 16);
    const b1 = parseInt(c1.substr(4, 2), 16);
    
    const r2 = parseInt(c2.substr(0, 2), 16);
    const g2 = parseInt(c2.substr(2, 2), 16);
    const b2 = parseInt(c2.substr(4, 2), 16);
    
    // Interpola cada componente
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    // Converte de volta para hex
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
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

    // Desenha o slider - Coluna Esquerda (visualização original)
    let currentY = SLIDER_START_Y;
    let accumulatedLayers = 0;

    layers.forEach((layer, index) => {
      const nextAccumulatedLayers = index < layers.length - 1 
        ? Math.floor((layers[index].heightPercentage / 100) * totalLayers)
        : totalLayers;
      const layerCount = nextAccumulatedLayers - accumulatedLayers;
      const sectionHeight = layerCount * layerPixelHeight;

      // Desenha a seção com cor sólida (visualização original)
      ctx.fillStyle = layer.color;
      ctx.fillRect(LEFT_COLUMN_X, currentY, COLUMN_WIDTH, sectionHeight);
      
      // Desenha a borda
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(LEFT_COLUMN_X, currentY, COLUMN_WIDTH, sectionHeight);

      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    });

    // Reset das variáveis para a coluna direita
    currentY = SLIDER_START_Y;
    accumulatedLayers = 0;
    let previousColor = '#000000'; // Cor inicial (preto)

    // Desenha o slider - Coluna Direita (visualização com TD)
    layers.forEach((layer, index) => {
      const nextAccumulatedLayers = index < layers.length - 1 
        ? Math.floor((layers[index].heightPercentage / 100) * totalLayers)
        : totalLayers;
      const layerCount = nextAccumulatedLayers - accumulatedLayers;
      const sectionHeight = layerCount * layerPixelHeight;

      // Calcula quantas camadas são necessárias para atingir a cor completa baseado no TD
      const layersForFullColor = Math.ceil(layer.td / layerHeight);
      
      // Desenha a transição de cor
      for (let i = 0; i < layerCount; i++) {
        const y = currentY + (i * layerPixelHeight);
        const progress = Math.min(1, i / layersForFullColor);
        const currentColor = interpolateColor(previousColor, layer.color, progress);
        
        ctx.fillStyle = currentColor;
        ctx.fillRect(RIGHT_COLUMN_X, y, COLUMN_WIDTH, layerPixelHeight);
        
        // Desenha a borda
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(RIGHT_COLUMN_X, y, COLUMN_WIDTH, layerPixelHeight);
      }

      previousColor = layer.color;
      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    });

    // Desenha linhas tracejadas para cada camada
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    for (let i = 0; i <= totalLayers; i++) {
      const y = SLIDER_START_Y + (i * layerPixelHeight);
      // Linha para coluna esquerda
      ctx.beginPath();
      ctx.moveTo(LEFT_COLUMN_X, y);
      ctx.lineTo(LEFT_COLUMN_X + COLUMN_WIDTH, y);
      ctx.stroke();
      // Linha para coluna direita
      ctx.beginPath();
      ctx.moveTo(RIGHT_COLUMN_X, y);
      ctx.lineTo(RIGHT_COLUMN_X + COLUMN_WIDTH, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Reset das variáveis para os botões
    currentY = SLIDER_START_Y;
    accumulatedLayers = 0;

    // Desenha os botões e tooltips
    layers.forEach((layer, index) => {
      const nextAccumulatedLayers = index < layers.length - 1 
        ? Math.floor((layer.heightPercentage / 100) * totalLayers)
        : totalLayers;
      const layerCount = nextAccumulatedLayers - accumulatedLayers;
      const sectionHeight = layerCount * layerPixelHeight;

      // Desenha o botão de remover apenas se o mouse estiver sobre esta seção
      if (layers.length > 1 && hoveredY !== null && 
          hoveredY >= currentY && hoveredY <= currentY + sectionHeight) {
        const buttonX = CENTER_X;
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
        // Estende a área de arrasto para cobrir ambas as colunas
        ctx.fillRect(LEFT_COLUMN_X, dividerY - DRAG_HANDLE_HEIGHT/2, CANVAS_WIDTH - 20, DRAG_HANDLE_HEIGHT);

        // Verifica se é possível adicionar uma cor nesta divisória
        const currentLayerCount = Math.floor((layers[index].heightPercentage / 100) * totalLayers);
        const nextLayerCount = Math.floor((layers[index + 1].heightPercentage / 100) * totalLayers) - 
                             Math.floor((layers[index].heightPercentage / 100) * totalLayers);

        if ((currentLayerCount > 1 || nextLayerCount > 1) && 
            hoveredY !== null && 
            Math.abs(hoveredY - dividerY) <= DRAG_HANDLE_HEIGHT/2) {
          // Desenha o botão de adicionar na divisória
          const buttonX = CENTER_X;
          
          ctx.beginPath();
          ctx.arc(buttonX, dividerY, BUTTON_RADIUS, 0, Math.PI * 2);
          ctx.fillStyle = '#4CAF50';
          ctx.fill();
          
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 14px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('+', buttonX, dividerY);
        }
      }

      // Desenha o tooltip se o mouse estiver sobre esta seção
      if (hoveredY !== null && hoveredY >= currentY && hoveredY <= currentY + sectionHeight) {
        const startLayer = accumulatedLayers + 1;
        const endLayer = nextAccumulatedLayers;
        
        // Verifica se está sobre uma divisória
        const dividerY = currentY + sectionHeight;
        const isOverDivider = Math.abs(hoveredY - dividerY) <= DRAG_HANDLE_HEIGHT/2;
        
        let tooltipText;
        if (isOverDivider && index < layers.length - 1) {
          tooltipText = `Layer ${endLayer}`;
        } else {
          tooltipText = `Layers ${startLayer}-${endLayer}`;
        }
        
        ctx.font = '12px Arial';
        const tooltipWidth = ctx.measureText(tooltipText).width + 20;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, hoveredY - 20, tooltipWidth, 20);
        
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(tooltipText, 20, hoveredY - 10);
      }

      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    drawSlider();
  }, [layers, hoveredY, isDragging, drawSlider]);

  // Adiciona um useEffect para monitorar o imageData
  useEffect(() => {
    if (!imageData) return;
    console.log('LayerColorSlider - imageData atualizado:', {
      presente: !!imageData,
      dimensoes: imageData ? `${imageData.width}x${imageData.height}` : 'N/A',
      dadosPresentes: imageData ? `${imageData.data.length} bytes` : 'N/A',
      primeiroPixel: imageData ? `R:${imageData.data[0]},G:${imageData.data[1]},B:${imageData.data[2]}` : 'N/A'
    });
  }, [imageData]);

  useEffect(() => {
    drawSlider();
  }, [layers, drawSlider]);

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

    // Verifica se o mouse está sobre alguma divisória
    const dividerPositions = getDividerPositions();
    const isOverAnyDivider = dividerPositions.some(pos => 
      Math.abs(y - pos) <= DRAG_HANDLE_HEIGHT/2
    );
    setIsOverDivider(isOverAnyDivider);

    if (isDragging !== null && isDragging < layers.length - 1 && originalPositions !== null) {
      const newLayers = [...layers];
      
      // Calcula a camada atual baseado na posição Y
      const relativeY = Math.max(SLIDER_START_Y, Math.min(y, SLIDER_START_Y + SLIDER_HEIGHT));
      const mouseLayer = Math.floor((relativeY - SLIDER_START_Y) / layerPixelHeight);

      // Se é o primeiro movimento, inicializa lastValidLayer
      if (lastValidLayer === null) {
        const initialLayer = Math.floor((layers[isDragging].heightPercentage / 100) * totalLayers);
        setLastValidLayer(initialLayer);
        return;
      }

      // Obtém os limites em número de camadas
      const minLayer = isDragging > 0 
        ? Math.floor((layers[isDragging - 1].heightPercentage / 100) * totalLayers) + 1
        : 1;
      const maxLayer = isDragging < layers.length - 1 
        ? Math.floor((layers[isDragging + 1].heightPercentage / 100) * totalLayers) - 1
        : totalLayers - 1;

      // Calcula a diferença em camadas
      const diff = mouseLayer - lastValidLayer;
      
      // Verifica se o mouse está em uma camada diferente da atual
      if (mouseLayer !== lastValidLayer) {
        // Move apenas uma camada na direção do mouse
        const nextLayer = mouseLayer > lastValidLayer 
          ? lastValidLayer + 1  // Move uma camada para cima
          : lastValidLayer - 1; // Move uma camada para baixo
        
        // Verifica se está dentro dos limites
        if (nextLayer >= minLayer && nextLayer <= maxLayer) { //
          setLastValidLayer(mouseLayer);
          
          // Converte para porcentagem
          const currentPercentage = Number(((nextLayer / totalLayers) * 100).toFixed(6));
          
          // Atualiza a posição da divisória
          newLayers[isDragging] = {
            ...newLayers[isDragging],
            heightPercentage: currentPercentage
          };
          onChange(newLayers);
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setLastValidLayer(null);
    const { x, y } = getCanvasCoordinates(e);

    // Verifica se clicou em um botão de remover
    let currentY = SLIDER_START_Y;
    let accumulatedLayers = 0;

    for (let i = 0; i < layers.length; i++) {
      const nextAccumulatedLayers = i < layers.length - 1 
        ? Math.floor((layers[i].heightPercentage / 100) * totalLayers)
        : totalLayers;
      const sectionHeight = (nextAccumulatedLayers - accumulatedLayers) * layerPixelHeight;

      // Verifica se clicou dentro da seção da cor (excluindo a área dos botões)
      if (y >= currentY && y <= currentY + sectionHeight && x >= 10 && x <= CANVAS_WIDTH - 40) {
        // Se for duplo clique, abre o color picker para esta camada
        if (e.detail === 2) {
          setSelectedDividerIndex(i);
          setIsAddingNewColor(false);
          setShowColorPicker(true);
          return;
        }
      }

      const buttonY = currentY + sectionHeight / 2;

      // Verifica se clicou no botão de remover (apenas se o mouse estiver sobre a seção)
      if (hoveredY !== null && 
          hoveredY >= currentY && 
          hoveredY <= currentY + sectionHeight &&
          Math.hypot(x - CENTER_X, y - buttonY) <= BUTTON_RADIUS) {
        if (layers.length > 1) {
          const newLayers = [...layers];
          newLayers.splice(i, 1);
          
          if (i === 0 && newLayers.length > 0) {
            const scale = 100 / newLayers[newLayers.length - 1].heightPercentage;
            newLayers.forEach(layer => {
              layer.heightPercentage *= scale;
            });
          } else {
            const prevPercentage = i > 0 ? layers[i - 1].heightPercentage : 0;
            const removedRange = layers[i].heightPercentage - prevPercentage;
            
            for (let j = i; j < newLayers.length; j++) {
              newLayers[j].heightPercentage -= removedRange;
            }
          }
          
          newLayers[newLayers.length - 1].heightPercentage = 100;
          onChange(newLayers);
        }
        return;
      }

      // Verifica se clicou no botão de adicionar na divisória
      if (i < layers.length - 1) {
        const dividerY = currentY + sectionHeight;
        const currentLayerCount = Math.floor((layers[i].heightPercentage / 100) * totalLayers);
        const nextLayerCount = Math.floor((layers[i + 1].heightPercentage / 100) * totalLayers) - 
                             Math.floor((layers[i].heightPercentage / 100) * totalLayers);

        if ((currentLayerCount > 1 || nextLayerCount > 1) && 
            Math.abs(y - dividerY) <= DRAG_HANDLE_HEIGHT/2 &&
            Math.hypot(x - CENTER_X, y - dividerY) <= BUTTON_RADIUS) {
          setSelectedDividerIndex(i);
          setIsAddingNewColor(true);
          setShowColorPicker(true);
          return;
        }
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
      const positions = layers.map(layer => layer.heightPercentage);
      setOriginalPositions(positions);
      setIsDragging(dividerIndex);
    }
  };

  const handleMouseUp = () => {
    setLastValidLayer(null);
    setIsDragging(null);
    setOriginalPositions(null);
  };

  const handleColorSelect = (color: string, td: number) => {
    if (selectedDividerIndex !== null) {
      // Se estamos editando uma cor existente
      if (!isAddingNewColor) {
        const newLayers = [...layers];
        newLayers[selectedDividerIndex] = {
          ...newLayers[selectedDividerIndex],
          color,
          td
        };
        onChange(newLayers);
      } else {
        // Estamos adicionando uma nova cor entre camadas existentes
        const currentIndex = selectedDividerIndex;
        
        // Calcula as porcentagens
        const currentLayerPercentage = layers[currentIndex].heightPercentage;
        const nextLayerPercentage = layers[currentIndex + 1].heightPercentage;
        const availablePercentage = nextLayerPercentage - currentLayerPercentage;
        
        // Cria um novo array de camadas
        const newLayers = [...layers];
        
        // Ajusta a porcentagem da camada atual
        newLayers[currentIndex] = {
          ...layers[currentIndex],
          heightPercentage: currentLayerPercentage
        };
        
        // Cria a nova camada com metade do espaço disponível
        const newLayer = {
          color,
          td,
          heightPercentage: currentLayerPercentage + (availablePercentage / 2)
        };
        
        // Ajusta a porcentagem da próxima camada
        newLayers[currentIndex + 1] = {
          ...layers[currentIndex + 1],
          heightPercentage: nextLayerPercentage
        };
        
        // Insere a nova camada após a camada atual
        newLayers.splice(currentIndex + 1, 0, newLayer);
        
        // Ajusta as porcentagens das camadas subsequentes
        for (let i = currentIndex + 2; i < newLayers.length; i++) {
          newLayers[i] = {
            ...newLayers[i],
            heightPercentage: layers[i - 1].heightPercentage
          };
        }
        
        console.log('Layers antes:', layers.length, 'Layers depois:', newLayers.length);
        onChange(newLayers);
      }
    }
    setShowColorPicker(false);
    setSelectedDividerIndex(null);
    setIsAddingNewColor(false);
  };

  const handlePatternSelect = (newLayers: LayerConfig[]) => {
    onChange(newLayers);
  };

  return (
    <div ref={containerRef} className="layer-color-slider">
      <PatternSelector onSelectPattern={handlePatternSelect} imageData={imageData} />
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => {
          handleMouseUp();
          setIsOverDivider(false);
        }}
        style={{ 
          cursor: isDragging !== null || isOverDivider ? 'ns-resize' : 'default',
          width: '200px',
          height: '400px'
        }}
      />
      {showColorPicker && selectedDividerIndex !== null && (
        <ColorPicker
          onColorSelect={(color, td) => handleColorSelect(color, td)}
          onClose={() => {
            setShowColorPicker(false);
            setSelectedDividerIndex(null);
            setIsAddingNewColor(false);
          }}
          initialColor={!isAddingNewColor ? layers[selectedDividerIndex].color : undefined}
          initialTd={!isAddingNewColor ? layers[selectedDividerIndex].td : undefined}
        />
      )}
    </div>
  );
};

export default LayerColorSlider; 