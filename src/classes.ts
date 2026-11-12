import { z } from 'zod';

export const CLASS_IDS = ['fighter', 'wizard', 'rogue'] as const;
export const ClassId = z.enum(CLASS_IDS);
export type ClassId = z.infer<typeof ClassId>;

export const Difficulty = z.enum(['normal', 'hardcore']);
export type Difficulty = z.infer<typeof Difficulty>;
