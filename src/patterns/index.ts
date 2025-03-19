import { Pattern } from './types/types';
import { dominantColorsPattern } from './algorithms/dominantColors';
import { grayscalePattern } from './algorithms/grayscale';
import { posterizedPattern } from './algorithms/posterized';
import { grayscaleDistributedPattern } from './algorithms/grayscaleDistributed';

export const patterns: Pattern[] = [
  grayscalePattern,
  grayscaleDistributedPattern,
  posterizedPattern,
  dominantColorsPattern
];

export * from './types/types';
