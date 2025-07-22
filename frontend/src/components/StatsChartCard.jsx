import React, { useState } from 'react';
import Logo from '../assets/logo.svg';

const periods = [
  { label: '1H', value: '1h' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: 'ALL', value: 'all' },
];

function getPathFromData(data, width = 300, height = 100) {
  if (!data || data.length < 2) return '';
  const maxY = Math.max(...data.map(d => d.value));
  const minY = Math.min(...data.map(d => d.value));
  const rangeY = maxY - minY || 1;
  const stepX = width / (data.length - 1);
  return data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d.value - minY) / rangeY) * height;
    return `${i === 0 ? 'M' : 'L'}${x},${y}`;
  }).join(' ');
}

export default function StatsChartCard({
  title = 'Статистика',
  value = '70%',
  change = '-2.92%',
  period = '1w',
  onPeriodChange,
  data = [],
  xLabels = [],
  yUnit = '',
}) {
  const [selected, setSelected] = useState(period);
  const width = 300;
  const height = 100;
  const path = getPathFromData(data, width, height);
  const maxY = data.length ? Math.max(...data.map(d => d.value)) : 1;
  const minY = data.length ? Math.min(...data.map(d => d.value)) : 0;

  return (
    <div className="relative w-full max-w-xs mx-auto" style={{ minWidth: 280, minHeight: 320 }}>
      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-neutral-700 z-0 blur-2xl opacity-60" />
      <div className="relative z-10 bg-gradient-to-t from-white/10 to-white/0 rounded-3xl p-0.5 shadow-2xl" style={{ boxShadow: '0 0px 80px -10px rgba(255,255,255,0.15)' }}>
        <div className="card-charts w-full h-full rounded-3xl overflow-hidden flex flex-col bg-gradient-radial from-neutral-900 via-black to-black">
          {/* Переключатели периодов */}
          <div className="flex items-center justify-between gap-1 px-5 pt-5 pb-2">
            {periods.map((p) => (
              <label key={p.value} className="relative flex items-center justify-center w-10 cursor-pointer">
                <input
                  type="radio"
                  name="period"
                  value={p.value}
                  checked={selected === p.value}
                  onChange={() => { setSelected(p.value); onPeriodChange && onPeriodChange(p.value); }}
                  className="hidden"
                />
                <span className={`name w-full py-1 px-0.5 flex items-center justify-center rounded-lg text-xs font-semibold transition-all z-10 ${selected === p.value ? 'bg-gradient-to-tr from-neutral-700 via-black to-black text-white scale-110' : 'text-neutral-400 hover:text-white'}`}>{p.label}</span>
              </label>
            ))}
          </div>
          {/* Логотип и значения */}
          <div className="flex flex-col items-center justify-center px-5">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-2">
              <img src={Logo} alt="KB Logo" className="w-8 h-8" />
            </div>
            <p className="title text-2xl font-bold bg-gradient-to-tl from-yellow-900 via-yellow-300 to-neutral-300 bg-clip-text text-transparent mb-1">{title}</p>
            <p className="change text-lg font-semibold bg-gradient-to-r from-red-900 via-white to-white bg-clip-text text-transparent mb-2">{value}</p>
            <p className="text-xs text-neutral-400 mb-2">Изменение: {change}</p>
          </div>
          {/* SVG график */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-2 pb-4">
            <svg viewBox={`0 0 ${width} ${height}`} fill="none" className="w-full h-32" style={{ minHeight: 100 }}>
              <defs>
                <linearGradient id="chartLine" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#89FB73" stopOpacity="0.05" />
                  <stop offset="0.5" stopColor="#fff" />
                  <stop offset="1" stopColor="#A62727" stopOpacity="0.1" />
                </linearGradient>
              </defs>
              {/* Вертикальные линии */}
              {[...Array(data.length)].map((_, i) => (
                <rect key={i} x={i * (width / (data.length - 1))} y="0" width="1.5" height={height} fill="url(#chartLine)" opacity="0.2" />
              ))}
              {/* Линия графика */}
              {path && (
                <path
                  d={path}
                  stroke="url(#chartLine)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray="1500"
                  style={{ animation: 'draw 4s ease-in-out infinite' }}
                />
              )}
              {/* Подписи оси X */}
              {xLabels && xLabels.length > 1 && xLabels.map((label, i) => (
                <text key={i} x={i * (width / (xLabels.length - 1))} y={height + 12} textAnchor="middle" fontSize="10" fill="#888">{label}</text>
              ))}
              {/* Подписи оси Y */}
              <text x="0" y="10" fontSize="10" fill="#888">{maxY}{yUnit}</text>
              <text x="0" y={height - 2} fontSize="10" fill="#888">{minY}{yUnit}</text>
            </svg>
            <style>{`
              @keyframes draw {
                0% { stroke-dashoffset: 1500; opacity: 0.8; }
                50% { stroke-dashoffset: 0; }
                100% { stroke-dashoffset: -1500; opacity: 0.8; }
              }
            `}</style>
          </div>
        </div>
      </div>
    </div>
  );
} 