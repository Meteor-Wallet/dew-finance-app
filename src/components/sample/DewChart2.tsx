"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ReferenceLine,
} from "recharts";

const data = [
  { date: "Dec 9", value: 0.0 },
  { date: "Mar 13", value: 5.024 },
  { date: "Jun 14", value: 1.048 },
  { date: "Sep 15", value: 3.072 },
  { date: "Sep 30", value: 2.072 },
  { date: "Dec 15", value: 3.072 },
  { date: "Dec 16", value: 4.72 },
];

export default function DewChart2({
  data
}: {
  data: {
    date: string;
    value: number;
  }[]
}) {
  return (
    <div className="w-full h-96">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
          {/* Background grid */}
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />

          {/* X Axis */}
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }} />

          {/* Y Axis */}
          <YAxis
            domain={["auto", "auto"]}
            tickFormatter={(v) => v.toFixed(4)}
            tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 12 }}
          />

          <Tooltip
            contentStyle={{ backgroundColor: "#0D0D0D", border: "none" }}
            labelStyle={{ color: "#fff" }}
          />

          {/* Gradient defs */}
          <defs>
            <linearGradient id="dewGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8EFFEF" stopOpacity={1} />
              <stop offset="33%" stopColor="#00C8BA" stopOpacity={1} />
              <stop offset="95%" stopColor="rgba(0, 51, 52, 0)" stopOpacity={0} />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feFlood floodColor="rgba(142,255,239,0.6)" result="glowColor" />
              <feComposite in="glowColor" in2="SourceAlpha" operator="in" />
              <feGaussianBlur stdDeviation="6" result="blurredGlow" />
              <feMerge>
                <feMergeNode in="blurredGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Area with gradient */}
          <Area
            type="monotone"
            dataKey="value"
            stroke="none"
            fill="url(#dewGradient)"
            fillOpacity={0.6}
          />

          {/* Glow line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#c6fff6"
            strokeWidth={2}
            dot={false}
            filter="url(#glow)"
          />

          {/* Reference Lines */}
          <ReferenceLine x="Jun 14" stroke="#699cbf" strokeWidth={1} />
          <ReferenceLine x="Sep 15" stroke="#699cbf" strokeWidth={1} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
