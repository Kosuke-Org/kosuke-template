"use client";

import * as React from "react";
import { TrendingUp, Target, Zap, Users } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  Cell,
  Pie,
  PieChart,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";

// Advanced chart data
const radarData = [
  {
    subject: "Math",
    A: 120,
    B: 110,
    fullMark: 150,
  },
  {
    subject: "Chinese",
    A: 98,
    B: 130,
    fullMark: 150,
  },
  {
    subject: "English",
    A: 86,
    B: 130,
    fullMark: 150,
  },
  {
    subject: "Geography",
    A: 99,
    B: 100,
    fullMark: 150,
  },
  {
    subject: "Physics",
    A: 85,
    B: 90,
    fullMark: 150,
  },
  {
    subject: "History",
    A: 65,
    B: 85,
    fullMark: 150,
  },
];

const mixedData = [
  {
    name: "Jan",
    revenue: 4000,
    profit: 2400,
    growth: 24,
  },
  {
    name: "Feb",
    revenue: 3000,
    profit: 1398,
    growth: 22,
  },
  {
    name: "Mar",
    revenue: 2000,
    profit: 9800,
    growth: 29,
  },
  {
    name: "Apr",
    revenue: 2780,
    profit: 3908,
    growth: 20,
  },
  {
    name: "May",
    revenue: 1890,
    profit: 4800,
    growth: 18,
  },
  {
    name: "Jun",
    revenue: 2390,
    profit: 3800,
    growth: 23,
  },
];

const pieChartData = [
  { name: "Group A", value: 400, fill: "var(--color-group-a)" },
  { name: "Group B", value: 300, fill: "var(--color-group-b)" },
  { name: "Group C", value: 300, fill: "var(--color-group-c)" },
  { name: "Group D", value: 200, fill: "var(--color-group-d)" },
];

// Chart configurations
const radarChartConfig = {
  A: {
    label: "Student A",
    color: "hsl(var(--chart-1))",
  },
  B: {
    label: "Student B",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

const mixedChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-2))",
  },
  growth: {
    label: "Growth %",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig;

const pieConfig = {
  "group-a": {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  "group-b": {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
  "group-c": {
    label: "Tablet",
    color: "hsl(var(--chart-3))",
  },
  "group-d": {
    label: "Other",
    color: "hsl(var(--chart-4))",
  },
} satisfies ChartConfig;

export function RadarChartComponent() {
  return (
    <Card>
      <CardHeader className="items-center pb-4">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Radar Chart
        </CardTitle>
        <CardDescription>
          Performance comparison across multiple subjects
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={radarChartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <RadarChart data={radarData}>
            <ChartTooltip content={<ChartTooltipContent />} />
            <PolarAngleAxis dataKey="subject" />
            <PolarGrid />
            <Radar
              dataKey="A"
              stroke="var(--color-A)"
              fill="var(--color-A)"
              fillOpacity={0.6}
            />
            <Radar
              dataKey="B"
              stroke="var(--color-B)"
              fill="var(--color-B)"
              fillOpacity={0.6}
            />
          </RadarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Student B showing improvement <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Performance across 6 subjects
        </div>
      </CardFooter>
    </Card>
  );
}

export function ComposedChartComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Mixed Chart
        </CardTitle>
        <CardDescription>
          Revenue, profit, and growth rate combined
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={mixedChartConfig}>
          <ComposedChart
            width={500}
            height={300}
            data={mixedData}
            margin={{
              top: 20,
              right: 80,
              bottom: 20,
              left: 20,
            }}
          >
            <CartesianGrid stroke="#f5f5f5" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar yAxisId="left" dataKey="revenue" fill="var(--color-revenue)" />
            <Bar yAxisId="left" dataKey="profit" fill="var(--color-profit)" />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="growth"
              stroke="var(--color-growth)"
              strokeWidth={3}
            />
          </ComposedChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col items-start gap-2 text-sm">
        <div className="flex gap-2 font-medium leading-none">
          Revenue trending up by 12% <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          January - June 2024
        </div>
      </CardFooter>
    </Card>
  );
}

export function PieChartWithCustomShape() {
  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pie Chart - Custom
        </CardTitle>
        <CardDescription>Device usage distribution</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={pieConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Desktop usage trending up <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Q1 2024 device analytics
        </div>
      </CardFooter>
    </Card>
  );
}