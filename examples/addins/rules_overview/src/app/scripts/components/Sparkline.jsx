import React from 'react';

const Sparkline = ({
  data = [],
  width = 80,
  height = 24,
  color = '#2C6ECB',
  fillColor,
}) => {
  const padding = 2;
  const dotRadius = 2;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  // No data: render a dashed horizontal line
  if (!data || data.length === 0 || data.every(v => v === 0)) {
    const midY = height / 2;
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <line
          x1={padding}
          y1={midY}
          x2={width - padding}
          y2={midY}
          stroke="#ccc"
          strokeWidth={1}
          strokeDasharray="4 3"
        />
      </svg>
    );
  }

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;

  const points = data.map((value, i) => {
    const x = padding + (i / (data.length - 1)) * innerWidth;
    // If all values are the same (flat), center the line
    const y = range === 0
      ? height / 2
      : padding + innerHeight - ((value - min) / range) * innerHeight;
    return { x, y };
  });

  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');

  // Build a closed polygon for the area fill
  const fill = fillColor || (color + '20');
  const areaPoints = [
    `${points[0].x},${height - padding}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${height - padding}`,
  ].join(' ');

  const lastPoint = points[points.length - 1];

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polygon
        points={areaPoints}
        fill={fill}
        stroke="none"
      />
      <polyline
        points={polylinePoints}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={lastPoint.x}
        cy={lastPoint.y}
        r={dotRadius}
        fill={color}
      />
    </svg>
  );
};

export default Sparkline;
