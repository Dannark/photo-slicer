import * as THREE from 'three';

export const createExtrudedGeometry = (
  geometry: THREE.BufferGeometry,
  baseThickness: number
): THREE.BufferGeometry => {
  const positions = geometry.attributes.position.array;
  const newPositions: number[] = [];
  const newIndices: number[] = [];
  const existingIndices = Array.from(geometry.index?.array || []);

  // Mapeia as coordenadas x e y únicas para encontrar os vértices mais externos
  const uniqueX = new Set<number>();
  const uniqueY = new Set<number>();
  
  for (let i = 0; i < positions.length; i += 3) {
    uniqueX.add(positions[i]);
    uniqueY.add(positions[i + 1]);
  }

  const sortedX = Array.from(uniqueX).sort((a, b) => a - b);
  const sortedY = Array.from(uniqueY).sort((a, b) => a - b);
  const minX = sortedX[0];
  const maxX = sortedX[sortedX.length - 1];
  const minY = sortedY[0];
  const maxY = sortedY[sortedY.length - 1];

  // Arrays para armazenar os vértices das bordas por lado
  const leftEdge: number[] = [];
  const rightEdge: number[] = [];
  const topEdge: number[] = [];
  const bottomEdge: number[] = [];

  // Copia os vértices originais
  for (let i = 0; i < positions.length; i++) {
    newPositions.push(positions[i]);
  }

  // Primeiro, vamos mapear todos os vértices e suas bordas
  for (let i = 0; i < positions.length / 3; i++) {
    const idx = i * 3;
    const x = positions[idx];
    const y = positions[idx + 1];

    // Classifica os vértices das bordas usando comparação exata
    if (x === minX) leftEdge.push(i);
    if (x === maxX) rightEdge.push(i);
    if (y === minY) bottomEdge.push(i);
    if (y === maxY) topEdge.push(i);
  }

  // Ordena as bordas por coordenada para garantir continuidade
  leftEdge.sort((a, b) => positions[a * 3 + 1] - positions[b * 3 + 1]);
  rightEdge.sort((a, b) => positions[a * 3 + 1] - positions[b * 3 + 1]);
  topEdge.sort((a, b) => positions[a * 3] - positions[b * 3]);
  bottomEdge.sort((a, b) => positions[a * 3] - positions[b * 3]);

  // Função auxiliar para criar faces da parede
  const createWallFaces = (edge: number[], wallType: 'left' | 'right' | 'top' | 'bottom') => {
    const wallVertices: number[] = [];
    
    // Cria vértices extrudados para cada vértice da borda
    edge.forEach(vertexIndex => {
      const baseIndex = vertexIndex * 3;
      newPositions.push(
        positions[baseIndex],
        positions[baseIndex + 1],
        -baseThickness
      );
      wallVertices.push(newPositions.length / 3 - 1);
    });

    // Cria faces entre vértices adjacentes
    for (let i = 0; i < edge.length - 1; i++) {
      const topLeft = edge[i];
      const topRight = edge[i + 1];
      const bottomLeft = wallVertices[i];
      const bottomRight = wallVertices[i + 1];

      // Ajusta a ordem dos vértices baseado no tipo de parede
      switch (wallType) {
        case 'left':
          // Parede esquerda - normal aponta para esquerda (-X)
          newIndices.push(
            topLeft,
            topRight,
            bottomLeft,
            bottomLeft,
            topRight,
            bottomRight
          );
          break;
        case 'right':
          // Parede direita - normal aponta para direita (+X)
          newIndices.push(
            topLeft,
            bottomLeft,
            topRight,
            topRight,
            bottomLeft,
            bottomRight
          );
          break;
        case 'top':
          // Parede superior (back) - normal aponta para trás (+Y)
          newIndices.push(
            topRight,
            bottomRight,
            topLeft,
            topLeft,
            bottomRight,
            bottomLeft
          );
          break;
        case 'bottom':
          // Parede inferior (front) - normal aponta para frente (-Y)
          newIndices.push(
            topRight,
            topLeft,
            bottomRight,
            bottomRight,
            topLeft,
            bottomLeft
          );
          break;
      }
    }
  };

  // Cria as paredes para cada borda
  createWallFaces(leftEdge, 'left');
  createWallFaces(rightEdge, 'right');
  createWallFaces(topEdge, 'top');
  createWallFaces(bottomEdge, 'bottom');

  // Cria a base (bottom face)
  // Primeiro, adiciona o vértice central
  const centerX = 0;
  const centerY = 0;
  const centerZ = -baseThickness;
  newPositions.push(centerX, centerY, centerZ);
  const centerIndex = newPositions.length / 3 - 1;

  // Coleta todos os vértices inferiores das paredes em ordem horária
  const bottomVertices: number[] = [];
  
  // Função auxiliar para adicionar vértices sem duplicatas
  const addUniqueVertex = (x: number, y: number) => {
    const vertexIndex = newPositions.length / 3;
    newPositions.push(x, y, -baseThickness);
    bottomVertices.push(vertexIndex);
  };

  // Adiciona os vértices em ordem horária
  bottomEdge.forEach(idx => addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]));
  rightEdge.forEach(idx => addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]));
  topEdge.reverse().forEach(idx => addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]));
  leftEdge.reverse().forEach(idx => addUniqueVertex(positions[idx * 3], positions[idx * 3 + 1]));

  // Remove vértices duplicados nas junções das bordas
  const uniqueBottomVertices = bottomVertices.filter((vertex, index, self) => {
    if (index === 0) return true;
    const prevX = newPositions[self[index - 1] * 3];
    const prevY = newPositions[self[index - 1] * 3 + 1];
    const currX = newPositions[vertex * 3];
    const currY = newPositions[vertex * 3 + 1];
    return Math.abs(prevX - currX) > 0.001 || Math.abs(prevY - currY) > 0.001;
  });

  // Cria os triângulos da base conectando ao centro
  for (let i = 0; i < uniqueBottomVertices.length; i++) {
    const current = uniqueBottomVertices[i];
    const next = uniqueBottomVertices[(i + 1) % uniqueBottomVertices.length];
    
    // Cria triângulo no sentido horário para a face ficar para baixo
    newIndices.push(
      centerIndex,
      next,
      current
    );
  }

  // Atualiza a geometria com os novos vértices e faces
  const finalGeometry = new THREE.BufferGeometry();
  finalGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
  finalGeometry.setIndex([...existingIndices, ...newIndices]);
  finalGeometry.computeVertexNormals();

  return finalGeometry;
};
