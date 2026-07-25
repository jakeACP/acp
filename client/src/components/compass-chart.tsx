interface CompassChartProps {
  economicScore: number;
  socialScore: number;
  size?: number;
  compact?: boolean;
  uid?: string;
}

export function CompassChart({
  economicScore, socialScore, size = 300, compact = false, uid = "a",
}: CompassChartProps) {
  const pad = compact ? 30 : 42;
  const area = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const scale = area / 2 / 10;

  const dotX = cx + economicScore * scale;
  const dotY = cy - socialScore * scale;

  const gridLines = [-8, -6, -4, -2, 2, 4, 6, 8];
  const glowId = `dotGlow-${uid}`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="drop-shadow-lg">
      <defs>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x={pad} y={pad} width={area / 2} height={area / 2} fill="#ef4444" fillOpacity="0.12" rx="2" />
      <rect x={cx}  y={pad} width={area / 2} height={area / 2} fill="#6366f1" fillOpacity="0.12" rx="2" />
      <rect x={pad} y={cy}  width={area / 2} height={area / 2} fill="#10b981" fillOpacity="0.12" rx="2" />
      <rect x={cx}  y={cy}  width={area / 2} height={area / 2} fill="#f59e0b" fillOpacity="0.12" rx="2" />

      {gridLines.map((v) => {
        const px = cx + v * scale;
        const py = cy - v * scale;
        return (
          <g key={v}>
            <line x1={px} y1={pad} x2={px} y2={size - pad} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <line x1={pad} y1={py} x2={size - pad} y2={py} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          </g>
        );
      })}

      <rect x={pad} y={pad} width={area} height={area} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" rx="4" />

      <line x1={cx} y1={pad} x2={cx} y2={size - pad} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />
      <line x1={pad} y1={cy} x2={size - pad} y2={cy} stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" />

      {!compact && (
        <>
          <text x={pad + 6} y={pad + 14} fontSize="8" fill="#ef4444" fillOpacity="0.8" fontWeight="600">State Progressive</text>
          <text x={cx + 6}  y={pad + 14} fontSize="8" fill="#818cf8" fillOpacity="0.8" fontWeight="600">National Conservative</text>
          <text x={pad + 6} y={size - pad - 5} fontSize="8" fill="#10b981" fillOpacity="0.8" fontWeight="600">Community Libertarian</text>
          <text x={cx + 6}  y={size - pad - 5} fontSize="8" fill="#f59e0b" fillOpacity="0.8" fontWeight="600">Market Libertarian</text>
        </>
      )}

      {!compact && (
        <>
          <text x={cx} y={pad - 8} fontSize="9" fill="rgba(255,255,255,0.6)" textAnchor="middle" fontWeight="500">AUTHORITARIAN</text>
          <text x={cx} y={size - pad + 16} fontSize="9" fill="rgba(255,255,255,0.6)" textAnchor="middle" fontWeight="500">LIBERTARIAN</text>
          <text x={pad - 4} y={cy + 4} fontSize="9" fill="rgba(255,255,255,0.6)" textAnchor="end" fontWeight="500" transform={`rotate(-90, ${pad - 4}, ${cy})`}>ECON. LEFT</text>
          <text x={size - pad + 4} y={cy + 4} fontSize="9" fill="rgba(255,255,255,0.6)" textAnchor="start" fontWeight="500" transform={`rotate(90, ${size - pad + 4}, ${cy})`}>ECON. RIGHT</text>
        </>
      )}

      <circle cx={dotX} cy={dotY} r="16" fill={`url(#${glowId})`} opacity="0.6" />
      <circle cx={dotX} cy={dotY} r="8"  fill="none" stroke="white" strokeWidth="2" opacity="0.7" />
      <circle cx={dotX} cy={dotY} r="5.5" fill="#f97316" />
      <circle cx={dotX - 1.5} cy={dotY - 1.5} r="1.5" fill="rgba(255,255,255,0.7)" />
    </svg>
  );
}
