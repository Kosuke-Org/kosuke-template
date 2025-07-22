# shadcn/ui Charts Integration

Official shadcn/ui chart components integrated directly into the dashboard, exactly as shown in the shadcn/ui documentation.

## 🎯 Overview

This integration demonstrates the exact chart examples from the official shadcn/ui documentation:

- **Bar Chart** - Basic bar chart with desktop and mobile data
- **Bar Chart - Interactive** - Interactive chart with toggleable data series
- **Area Chart** - Stacked area chart with natural curves
- **Line Chart** - Multi-series line chart with smooth interpolation
- **Pie Chart - Donut** - Browser usage statistics as donut chart

## 🚀 Features

### ✨ Interactive Components
- **Real-time Data Switching** - Toggle between different data sets
- **Custom Tooltips** - Rich, contextual information on hover
- **Responsive Design** - Works perfectly on all screen sizes
- **Accessibility Support** - Full keyboard navigation and screen reader support

### 🎨 Design System Integration
- **shadcn/ui Components** - Built with Card, Badge, and other UI components
- **Theme Support** - Automatic dark/light mode adaptation
- **CSS Variables** - Easy color customization with design tokens
- **Consistent Spacing** - Follows shadcn/ui design principles

### 📊 Chart Types Demonstrated

#### Basic Charts
1. **Bar Chart - Basic**
   - Simple grouped bar chart
   - Desktop vs Mobile comparison
   - Grid lines and axis labels
   - Legend and tooltips

2. **Bar Chart - Interactive**
   - Toggle between data series
   - Real-time total calculations
   - Interactive header controls
   - Date-based data formatting

3. **Line Chart**
   - Smooth line interpolation
   - Multiple data series
   - Customizable stroke width
   - Clean, minimal design

4. **Area Chart**
   - Stacked area visualization
   - Gradient fills with opacity
   - Natural curve interpolation
   - Beautiful visual hierarchy

#### Advanced Charts
5. **Pie Chart - Donut**
   - Browser usage statistics
   - Custom fill colors
   - Inner radius for donut effect
   - Percentage calculations

6. **Radial Chart**
   - Goal progress visualization
   - Custom start/end angles
   - Background indicators
   - Rounded corners

7. **Radar Chart**
   - Multi-dimensional comparison
   - Student performance metrics
   - Polar coordinate system
   - Overlapping data series

8. **Mixed Chart (ComposedChart)**
   - Revenue and profit bars
   - Growth rate line overlay
   - Dual Y-axes
   - Complex data relationships

## 🛠 Implementation

### Technology Stack
- **Framework**: Next.js 15 with TypeScript
- **Charts**: Recharts v2.15.4
- **UI Library**: shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables
- **Icons**: Lucide React

### Key Dependencies
```json
{
  "recharts": "^2.15.4",
  "lucide-react": "^0.511.0",
  "class-variance-authority": "^0.7.1",
  "tailwind-merge": "^3.3.0"
}
```

### Component Structure
```
components/
├── ui/
│   ├── chart.tsx              # Base chart components
│   ├── card.tsx               # Card wrapper components
│   ├── badge.tsx              # Badge components
│   └── button.tsx             # Button components
├── charts/
│   └── advanced-charts.tsx    # Advanced chart components
└── app-sidebar.tsx            # Navigation with charts section

app/(logged-in)/
└── charts/
    └── page.tsx              # Main charts showcase page
```

## 🎨 Customization

### Color System
The charts use a sophisticated color system based on CSS variables:

```css
:root {
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

.dark {
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}
```

### Chart Configuration
Each chart uses a typed configuration object:

```typescript
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile", 
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;
```

### Adding New Charts
1. Create chart data array
2. Define chart configuration
3. Wrap in `ChartContainer` with config
4. Add Recharts components
5. Include tooltips and legends

Example:
```typescript
<ChartContainer config={chartConfig}>
  <BarChart data={data}>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="month" />
    <ChartTooltip content={<ChartTooltipContent />} />
    <Bar dataKey="value" fill="var(--color-value)" />
  </BarChart>
</ChartContainer>
```

## 📱 Navigation

The charts are accessible through the sidebar navigation:
- **Charts** - Main section with expandable submenu
- **All Charts** - Complete showcase page
- **Bar Charts** - Direct link to bar chart section
- **Line Charts** - Direct link to line chart section  
- **Pie Charts** - Direct link to pie chart section
- **Advanced** - Direct link to advanced charts section

## 🔗 Resources

### Documentation Links
- **[shadcn/ui Charts](https://ui.shadcn.com/docs/components/chart)** - Official documentation
- **[Recharts Library](https://recharts.org/en-US/)** - Underlying chart library
- **[Chart Examples](https://ui.shadcn.com/charts)** - More examples and patterns

### Installation Commands
```bash
# Install chart component
npx shadcn@latest add chart

# Install required UI components
npx shadcn@latest add card badge button

# Add chart colors to CSS
# (See globals.css for color variables)
```

## 🎯 Use Cases

### Dashboard Applications
- KPI tracking and visualization
- Performance metrics display
- User analytics and insights
- Financial data presentation

### Business Intelligence
- Sales trend analysis
- Market share visualization
- Customer behavior patterns
- Operational efficiency metrics

### Data Analysis Tools
- Scientific data visualization
- Research findings presentation
- Statistical analysis results
- Comparative studies

### Educational Platforms
- Student performance tracking
- Learning progress visualization
- Assessment result analysis
- Academic metric displays

## ✨ Features in Detail

### Responsive Design
- Mobile-first approach
- Adaptive chart sizing
- Touch-friendly interactions
- Flexible grid layouts

### Accessibility Features
- Keyboard navigation support
- Screen reader compatibility
- High contrast color schemes
- Focus management

### Performance Optimizations
- Efficient re-rendering
- Memoized calculations
- Optimized data processing
- Minimal bundle impact

### Developer Experience
- TypeScript support
- Comprehensive type safety
- IntelliSense assistance
- Clear component APIs

## 🚀 Getting Started

1. **Navigate to Charts**
   - Open the application
   - Click "Charts" in the sidebar
   - Explore different chart types

2. **Interact with Charts**
   - Hover for tooltips
   - Click interactive elements
   - Toggle data series
   - View responsive behavior

3. **Copy Components**
   - View source code
   - Copy desired chart types
   - Adapt to your data
   - Customize styling

## 📊 Data Integration

### Static Data
Charts use predefined data arrays for demonstration:
```typescript
const monthlyData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  // ... more data
];
```

### Dynamic Data
For real applications, replace with:
- API endpoints
- Database queries
- Real-time data streams
- User-generated content

### Data Formats
Supports various data structures:
- Time series data
- Categorical data
- Hierarchical data
- Multi-dimensional arrays

This comprehensive showcase demonstrates the power and flexibility of shadcn/ui charts, providing a solid foundation for any data visualization needs in modern web applications.