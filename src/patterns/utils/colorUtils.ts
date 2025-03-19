export const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [h, s, v];
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

export const calculateTransmissivity = (value: number): number => {
  // Ajustamos a transmissividade baseada no valor (brilho)
  if (value < 0.25) return 0.6;
  if (value < 0.5) return 1.4;
  if (value < 0.75) return 2.8;
  return 5.0;
};

export const colorDistance = (hsv1: [number, number, number], hsv2: [number, number, number]): number => {
  const [h1, s1, v1] = hsv1;
  const [h2, s2, v2] = hsv2;
  
  // Damos mais peso para diferenças de matiz e saturação
  const dh = Math.min(Math.abs(h1 - h2), 1 - Math.abs(h1 - h2)) * 2;
  const ds = Math.abs(s1 - s2) * 1.5;
  const dv = Math.abs(v1 - v2);
  
  return Math.sqrt(dh * dh + ds * ds + dv * dv);
}; 