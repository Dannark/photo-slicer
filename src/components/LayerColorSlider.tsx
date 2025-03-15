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

  // Constantes
  const CANVAS_HEIGHT = 400;
  const CANVAS_WIDTH = 200;
  const SLIDER_START_Y = 30;
  const SLIDER_HEIGHT = CANVAS_HEIGHT - 60;
  const BUTTON_RADIUS = 8;
  const DRAG_HANDLE_HEIGHT = 10; // Altura da área de arrasto

  // Calcula o número total de camadas
  const firstLayerHeight = layerHeight * 2;
  const additionalBaseThickness = Math.max(0, baseThickness - firstLayerHeight);
  const additionalBaseLayers = Math.floor(additionalBaseThickness / layerHeight);
  const totalLayers = Math.floor(totalHeight / layerHeight) + additionalBaseLayers + 1; // +1 para a primeira camada
  
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

      currentY += sectionHeight;
      accumulatedLayers = nextAccumulatedLayers;
    });

    // Desenha linhas tracejadas para cada camada (DEPOIS das cores)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)'; // Vermelho puro
    ctx.lineWidth = 1; // Linha mais grossa
    ctx.setLineDash([4, 4]); // Padrão tracejado mais visível
    for (let i = 0; i <= totalLayers; i++) {
      const y = SLIDER_START_Y + (i * layerPixelHeight);
      ctx.beginPath();
      ctx.moveTo(10, y);
      ctx.lineTo(CANVAS_WIDTH - 30, y);
      ctx.stroke();
    }
    ctx.setLineDash([]); // Reset linha tracejada

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

        // Verifica se é possível adicionar uma cor nesta divisória
        const currentLayerCount = Math.floor((layers[index].heightPercentage / 100) * totalLayers);
        const nextLayerCount = Math.floor((layers[index + 1].heightPercentage / 100) * totalLayers) - 
                             Math.floor((layers[index].heightPercentage / 100) * totalLayers);

        if ((currentLayerCount > 1 || nextLayerCount > 1) && 
            hoveredY !== null && 
            Math.abs(hoveredY - dividerY) <= DRAG_HANDLE_HEIGHT/2) {
          // Desenha o botão de adicionar na divisória
          const buttonX = CANVAS_WIDTH - 20;
          
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
          // Se estiver sobre uma divisória, mostra a posição exata
          tooltipText = `Layer ${endLayer}`;
        } else {
          // Caso contrário, mostra o range de camadas
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
        console.log('Iniciando movimento:', {
          initialLayer,
          totalLayers,
          heightPercentage: layers[isDragging].heightPercentage
        });
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
      console.log('mouseLayer', mouseLayer)
      
      // Verifica se o mouse está em uma camada diferente da atual
      if (mouseLayer !== lastValidLayer) {
        // Move apenas uma camada na direção do mouse
        const nextLayer = mouseLayer > lastValidLayer 
          ? lastValidLayer + 1  // Move uma camada para cima
          : lastValidLayer - 1; // Move uma camada para baixo
        
        // Verifica se está dentro dos limites
        if (nextLayer >= minLayer && nextLayer <= maxLayer) {
          setLastValidLayer(nextLayer);
          
          // Converte para porcentagem
          const currentPercentage = Number(((nextLayer / totalLayers) * 100).toFixed(6));
          
          console.log('Debug movimento detalhado:', {
            camadaAtual: nextLayer,
            camadaDoMouse: mouseLayer,
            camadaAnterior: lastValidLayer,
            totalCamadas: totalLayers,
            porcentagemCalculada: currentPercentage,
            porcentagemAnterior: layers[isDragging].heightPercentage
          });
          
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
          setShowColorPicker(true);
          return;
        }
      }

      const buttonY = currentY + sectionHeight / 2;

      // Verifica se clicou no botão de remover (apenas se o mouse estiver sobre a seção)
      if (hoveredY !== null && 
          hoveredY >= currentY && 
          hoveredY <= currentY + sectionHeight &&
          Math.hypot(x - (CANVAS_WIDTH - 20), y - buttonY) <= BUTTON_RADIUS) {
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
            Math.hypot(x - (CANVAS_WIDTH - 20), y - dividerY) <= BUTTON_RADIUS) {
          setSelectedDividerIndex(i);
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

  const handleColorSelect = (color: string) => {
    if (selectedDividerIndex !== null) {
      const newLayers = [...layers];
      
      // Se estamos editando uma cor existente (duplo clique)
      if (selectedDividerIndex < layers.length) {
        newLayers[selectedDividerIndex].color = color;
      } else {
        // Lógica existente para adicionar nova cor entre camadas
        const currentIndex = selectedDividerIndex;
        
        // Calcula o número de camadas disponíveis
        const currentLayerCount = Math.floor((layers[currentIndex].heightPercentage / 100) * totalLayers);
        const nextLayerCount = Math.floor((layers[currentIndex + 1].heightPercentage / 100) * totalLayers) - 
                           Math.floor((layers[currentIndex].heightPercentage / 100) * totalLayers);
        
        // Decide de qual cor "pegar" uma camada
        let sourceIndex = currentLayerCount > 1 ? currentIndex : currentIndex + 1;
        
        // Calcula a nova porcentagem para uma camada
        const oneLayerPercentage = (1 / totalLayers) * 100;
        
        // Ajusta as porcentagens
        if (sourceIndex === currentIndex) {
          // Reduz uma camada da cor atual
          newLayers[currentIndex].heightPercentage -= oneLayerPercentage;
        } else {
          // Reduz uma camada da próxima cor
          newLayers[currentIndex + 1].heightPercentage -= oneLayerPercentage;
          
          // Ajusta as porcentagens das cores subsequentes
          for (let i = currentIndex + 2; i < newLayers.length; i++) {
            newLayers[i].heightPercentage -= oneLayerPercentage;
          }
        }
        
        // Insere a nova cor
        newLayers.splice(currentIndex + 1, 0, {
          color,
          heightPercentage: layers[currentIndex].heightPercentage + oneLayerPercentage
        });
      }
      
      onChange(newLayers);
    }
    setShowColorPicker(false);
    setSelectedDividerIndex(null);
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
          onColorSelect={(color) => handleColorSelect(color)}
          onClose={() => setShowColorPicker(false)}
        />
      )}
    </div>
  );
};

export default LayerColorSlider; 