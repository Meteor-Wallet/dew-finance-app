import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const data = [
  { name: "Party A", value: 8 },
  { name: "Party B", value: 10 },
  { name: "Party C", value: 15 },
  { name: "Party D", value: 20 },
  { name: "Party E", value: 12 },
  { name: "Party F", value: 35 },
]; // total = 100

const COLORS = [
  "#47FF93",
  "#3DA9EA",
  "#FFDD57",
  "#FF6F61",
  "#9B59B6",
  "#E67E22",
];

export default function AllocationDonut() {
  return (
    <div className="flex justify-center items-center">
      <PieChart width={400} height={300}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip formatter={(val: number) => `${val}%`} />
        <Legend />
      </PieChart>
    </div>
  );
}
