import clsx, { type ClassValue } from 'clsx';

/** Tailwind-friendly className combiner. */
export const cn = (...inputs: ClassValue[]) => clsx(inputs);
