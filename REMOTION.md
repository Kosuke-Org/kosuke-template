# Remotion Integration

This project now includes a cool animated video created with [Remotion](https://www.remotion.dev) that showcases the tech stack in an engaging way.

## 🎬 What's Included

The landing page now features a dynamic animation that includes:
- **Animated tech logos** floating in a circle formation
- **Terminal simulation** showing the getting started process
- **Particle effects** and smooth transitions
- **Responsive design** that works on all devices

## 🛠️ Working with Remotion

### View the Animation
The animation is automatically embedded in the home page at `/` and will auto-play with controls.

### Edit the Animation
To modify the animation, you can use the Remotion Studio:

```bash
npm run remotion
```

This opens the Remotion Studio at `http://localhost:3000` where you can:
- Preview your animations in real-time
- Adjust timing and transitions
- Modify visual elements
- Test different configurations

### Render Videos
To export the animation as a video file:

```bash
npm run remotion:render
```

This creates an `out.mp4` file with the rendered animation.

## 📁 File Structure

```
remotion/
├── index.ts                 # Entry point
├── Root.tsx                # Composition definitions
└── TechStackAnimation.tsx   # Main animation component
```

## 🎨 Customizing the Animation

### Modify the Tech Stack
Edit the `techStack` array in `remotion/TechStackAnimation.tsx`:

```typescript
const techStack = [
  { name: 'React', color: '#61DAFB', symbol: '⚛️' },
  { name: 'Your Tech', color: '#YOUR_COLOR', symbol: '🚀' },
  // Add your technologies here
];
```

### Adjust Animation Timing
Change the composition settings in `remotion/Root.tsx`:

```typescript
<Composition
  id="TechStackAnimation"
  component={TechStackAnimation}
  durationInFrames={240}  // 8 seconds at 30fps
  fps={30}
  width={800}
  height={600}
/>
```

### Styling
The animation uses the same color scheme as your app:
- Primary green: `#22c55e`
- Dark background gradients
- Monospace fonts
- Consistent border radius and shadows

## 🚀 Advanced Usage

### Creating New Compositions
1. Create a new component in the `remotion/` folder
2. Add it to `remotion/Root.tsx`:

```typescript
<Composition
  id="YourNewAnimation"
  component={YourNewAnimation}
  durationInFrames={150}
  fps={30}
  width={1920}
  height={1080}
/>
```

3. Use it in your components:

```typescript
import { Player } from '@remotion/player';
import { YourNewAnimation } from '../remotion/YourNewAnimation';

<Player
  component={YourNewAnimation}
  durationInFrames={150}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  controls
/>
```

## 📚 Learn More

- [Remotion Documentation](https://www.remotion.dev/docs)
- [Animation Examples](https://www.remotion.dev/showcase)
- [Remotion Templates](https://github.com/remotion-dev/template-remix)