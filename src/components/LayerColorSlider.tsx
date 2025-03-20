import React, { useRef, useEffect, useState } from 'react';
import { LayerConfig } from './HeightControls';
import ColorPicker from './ColorPicker';
import { PatternSelector } from './PatternSelector';
import { TD_MULTIPLIER } from '../constants/config';

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
  const [hoveredX, setHoveredX] = useState<number | null>(null);
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

  // Função para converter RGB para Hex
  const rgbToHex = (r: number, g: number, b: number): string => {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  // Função para converter Hex para RGB
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Função para misturar cores com alpha
  const blendColors = (topColor: string, bottomColor: string, alpha: number): string => {
    const [r1, g1, b1] = hexToRgb(topColor);
    const [r2, g2, b2] = hexToRgb(bottomColor);
    
    // Fórmula de composição alpha
    const r = (alpha * r1 + (1 - alpha) * r2);
    const g = (alpha * g1 + (1 - alpha) * g2);
    const b = (alpha * b1 + (1 - alpha) * b2);
    
    return rgbToHex(r, g, b);
  };

  const getColorAtPosition = (y: number, layers: LayerConfig[], totalHeight: number) => {
    if (layers.length === 0) return '#000000';

    // Calcula em qual camada estamos
    const currentLayer = Math.floor(y);
    
    // Encontra em qual seção de cor estamos
    let accumulatedLayers = 0;
    for (let i = 0; i < layers.length; i++) {
        const nextAccumulatedLayers = i < layers.length - 1 
            ? Math.floor((layers[i].heightPercentage / 100) * totalLayers)
            : totalLayers;
            
        if (currentLayer < nextAccumulatedLayers) {
            const td = layers[i].td * TD_MULTIPLIER;
            const transitionLayers = Math.max(1, Math.floor(td / layerHeight));
            
            // Calcula a posição relativa dentro desta seção de camadas
            const layerInSection = currentLayer - accumulatedLayers;
            
            console.log(`Camada ${currentLayer}:`, {
                secao: i,
                cor: layers[i].color,
                td,
                transitionLayers,
                layerInSection,
                accumulatedLayers,
                nextAccumulatedLayers
            });
            
            // Se estiver dentro da área de transição
            if (layerInSection < transitionLayers) {
                // Calcula o alpha base usando o TD
                // TD maior = alpha menor = mais transparente = transição mais suave
                // Limitamos o alpha entre 0.01 e 1 para evitar valores extremos
                const baseAlpha = Math.min(1, Math.max(0.01, 1 / td));
                
                // Função recursiva para aplicar a cor com transparência
                const applyColorWithTransparency = (
                    topColor: string, 
                    bottomColor: string, 
                    remainingLayers: number
                ): string => {
                    // Se não há mais camadas para aplicar, retorna a cor atual
                    if (remainingLayers <= 0) return bottomColor;
                    
                    // Aplica uma camada da cor superior com a transparência baseada no TD
                    const blendedColor = blendColors(topColor, bottomColor, baseAlpha);
                    
                    // Recursivamente aplica mais camadas
                    return applyColorWithTransparency(topColor, blendedColor, remainingLayers - 1);
                };
                
                const corAnterior = i > 0 ? layers[i-1].color : layers[0].color;
                const corAtual = layers[i].color;
                
                // Aplica as camadas de cor recursivamente
                const corResultante = applyColorWithTransparency(
                    corAtual,
                    corAnterior,
                    layerInSection + 1 // +1 porque começamos do 0
                );
                return corResultante;
            }
            
            return layers[i].color;
        }
        
        accumulatedLayers = nextAccumulatedLayers;
    }
    
    return layers[layers.length - 1].color;
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
    
    // Desenha o slider - Coluna Direita (visualização com TD)
    for (let i = 0; i < totalLayers; i++) {
        const currentColor = getColorAtPosition(i, layers, totalHeight);
        
        ctx.fillStyle = currentColor;
        ctx.fillRect(
            RIGHT_COLUMN_X, 
            SLIDER_START_Y + (i * layerPixelHeight), 
            COLUMN_WIDTH, 
            layerPixelHeight
        );
    }
    
    // Desenha uma única borda ao redor da coluna direita
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.strokeRect(RIGHT_COLUMN_X, SLIDER_START_Y, COLUMN_WIDTH, SLIDER_HEIGHT);

    // Desenha linhas tracejadas para cada camada
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    // Reset do padrão tracejado para cada linha
    for (let i = 0; i <= totalLayers; i++) {
        ctx.setLineDash([4, 4]); // Reset do padrão para cada linha
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
    ctx.setLineDash([]); // Restaura o padrão sólido

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
      if (hoveredY !== null && hoveredX !== null && 
          hoveredY >= currentY && hoveredY <= currentY + sectionHeight) {
        const startLayer = accumulatedLayers + 1;
        const endLayer = nextAccumulatedLayers;
        
        // Verifica se o mouse está na coluna da direita (>= 50% da largura)
        const isRightColumn = hoveredX >= CANVAS_WIDTH / 2;
        
        let tooltipText;
        if (isRightColumn) {
          // Na coluna da direita, mostra a layer atual
          const currentLayerNumber = Math.floor((hoveredY - SLIDER_START_Y) / layerPixelHeight) + 1;
          tooltipText = `Layer ${currentLayerNumber}`;
        } else {
          // Na coluna da esquerda, sempre mostra o range
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
    setHoveredX(x);
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
          setHoveredY(null);
          setHoveredX(null);
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