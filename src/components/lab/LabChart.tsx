import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/utils/cn';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { LabTrendData } from '@/types/lab';

interface LabChartProps {
  trendData: LabTrendData;
  height?: number;
}

export function LabChart({ trendData, height = 300 }: LabChartProps) {
  const { itemName, unit, referenceMin, referenceMax, dataPoints } = trendData;

  // Convert data points for Recharts
  const chartData = dataPoints.map((point) => ({
    date: point.date,
    value: typeof point.value === 'number' ? point.value : null,
    isAbnormal: point.isAbnormal,
    hlFlag: point.hlFlag,
  }));

  // Find min/max for Y-axis domain
  const values = chartData
    .map((d) => d.value)
    .filter((v): v is number => v !== null);

  if (values.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-center text-sm text-muted-foreground">
          차트를 표시할 수 있는 데이터가 없습니다.
        </p>
      </Card>
    );
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);

  // Calculate Y-axis domain with padding
  const padding = (maxValue - minValue) * 0.1 || 1;
  let yMin = minValue - padding;
  let yMax = maxValue + padding;

  // Extend domain to include reference range if needed
  if (referenceMin !== undefined) {
    yMin = Math.min(yMin, referenceMin - padding);
  }
  if (referenceMax !== undefined) {
    yMax = Math.max(yMax, referenceMax + padding);
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-lg border bg-background p-3 shadow-lg">
          <p className="mb-1 text-xs text-muted-foreground">{data.date}</p>
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {data.value} {unit}
            </p>
            {data.hlFlag && (
              <Badge
                variant={data.hlFlag === 'H' ? 'destructive' : 'default'}
                className={cn(
                  'h-5 px-1.5 text-xs',
                  data.hlFlag === 'L' && 'bg-blue-500 hover:bg-blue-600 text-white'
                )}
              >
                {data.hlFlag}
              </Badge>
            )}
          </div>
          {data.isAbnormal && (
            <p className={cn(
              'mt-1 text-xs',
              data.hlFlag === 'H' ? 'text-red-600' : 'text-blue-600'
            )}>
              비정상 범위
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom dot to highlight abnormal values
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isAbnormal) {
      // High: red, Low: blue
      const fillColor = payload.hlFlag === 'H' ? '#dc2626' : '#2563eb';
      return (
        <circle
          cx={cx}
          cy={cy}
          r={5}
          fill={fillColor}
          stroke="#fff"
          strokeWidth={2}
        />
      );
    }
    return (
      <circle
        cx={cx}
        cy={cy}
        r={4}
        fill="#3b82f6"
        stroke="#fff"
        strokeWidth={2}
      />
    );
  };

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{itemName}</h3>
          <div className="text-sm text-muted-foreground">
            {unit && <span className="inline-block">단위: {unit}</span>}
            {(referenceMin !== undefined || referenceMax !== undefined) && (
              <span className="inline-block ml-3 sm:ml-0 sm:block sm:mt-0.5">
                참조범위:{' '}
                {referenceMin !== undefined && referenceMax !== undefined
                  ? `${referenceMin} ~ ${referenceMax}`
                  : referenceMax !== undefined
                  ? `≤ ${referenceMax}`
                  : `≥ ${referenceMin}`}
              </span>
            )}
          </div>
        </div>
        <Badge variant="outline">{dataPoints.length}건</Badge>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          {/* Reference range as shaded area */}
          {referenceMin !== undefined && referenceMax !== undefined && (
            <ReferenceArea
              y1={referenceMin}
              y2={referenceMax}
              fill="#22c55e"
              fillOpacity={0.1}
              label="정상범위"
            />
          )}

          {/* Reference lines */}
          {referenceMin !== undefined && (
            <ReferenceLine
              y={referenceMin}
              stroke="#22c55e"
              strokeDasharray="3 3"
              label={{ value: '하한', fontSize: 10, fill: '#22c55e' }}
            />
          )}
          {referenceMax !== undefined && (
            <ReferenceLine
              y={referenceMax}
              stroke="#22c55e"
              strokeDasharray="3 3"
              label={{ value: '상한', fontSize: 10, fill: '#22c55e' }}
            />
          )}

          {/* Data line */}
          <Line
            type="monotone"
            dataKey="value"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
            name={itemName}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend for abnormal values */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-blue-500" />
          <span>정상</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-red-600" />
          <span>높음(H)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full bg-blue-600" />
          <span>낮음(L)</span>
        </div>
        {(referenceMin !== undefined || referenceMax !== undefined) && (
          <div className="flex items-center gap-1">
            <div className="h-0.5 w-4 bg-green-500" />
            <span>참조범위</span>
          </div>
        )}
      </div>
    </Card>
  );
}
