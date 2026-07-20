import { motion, useReducedMotion } from '@agrotraders/ui';

export function Sparkline({
  data,
  width = 120,
  height = 38,
  color = '#249653',
  animate = false,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  /** draw the line in on mount */
  animate?: boolean;
}) {
  const reduce = useReducedMotion();
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((d, i) => `${((i / (data.length - 1)) * width).toFixed(1)},${(height - ((d - min) / range) * height).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={animate && !reduce ? { pathLength: 0, opacity: 0 } : false}
        whileInView={animate && !reduce ? { pathLength: 1, opacity: 1 } : undefined}
        viewport={{ once: true, margin: '-20px' }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  );
}
