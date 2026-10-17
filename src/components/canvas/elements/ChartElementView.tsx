import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  LabelList,
} from "recharts";
import { ChartElement } from "@/types/deck";
import { toPieData, toRowData } from "@/lib/chartData";

export default function ChartElementView({ element }: { element: ChartElement }) {
  const { chart } = element;
  const colors = chart.colors ?? ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4"];

  return (
    <div className="flex h-full w-full flex-col">
      {chart.title && (
        <div className="mb-1 shrink-0 text-center text-xs font-semibold text-slate-600">
          {chart.title}
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          {chart.chartType === "bar" ? (
            <BarChart data={toRowData(chart)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip cursor={false} />
              {chart.showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {chart.series.map((s, i) => (
                <Bar key={s.name} dataKey={s.name} fill={colors[i % colors.length]}>
                  {chart.showDataLabels && <LabelList dataKey={s.name} position="top" fontSize={10} />}
                </Bar>
              ))}
            </BarChart>
          ) : chart.chartType === "line" ? (
            <LineChart data={toRowData(chart)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip cursor={false} />
              {chart.showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {chart.series.map((s, i) => (
                <Line key={s.name} type="monotone" dataKey={s.name} stroke={colors[i % colors.length]} strokeWidth={2}>
                  {chart.showDataLabels && <LabelList dataKey={s.name} position="top" fontSize={10} />}
                </Line>
              ))}
            </LineChart>
          ) : chart.chartType === "area" ? (
            <AreaChart data={toRowData(chart)} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip cursor={false} />
              {chart.showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              {chart.series.map((s, i) => (
                <Area
                  key={s.name}
                  type="monotone"
                  dataKey={s.name}
                  stroke={colors[i % colors.length]}
                  fill={colors[i % colors.length]}
                  fillOpacity={0.35}
                >
                  {chart.showDataLabels && <LabelList dataKey={s.name} position="top" fontSize={10} />}
                </Area>
              ))}
            </AreaChart>
          ) : (
            <PieChart>
              <Tooltip />
              {chart.showLegend && <Legend wrapperStyle={{ fontSize: 10 }} />}
              <Pie data={toPieData(chart)} dataKey="value" nameKey="name" outerRadius="80%" label={chart.showDataLabels}>
                {toPieData(chart).map((_, i) => (
                  <Cell key={i} fill={colors[i % colors.length]} />
                ))}
              </Pie>
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
