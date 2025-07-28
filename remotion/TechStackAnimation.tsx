import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const techStack = [
  { name: 'React', color: '#61DAFB', symbol: '⚛️' },
  { name: 'Next.js', color: '#000000', symbol: '▲' },
  { name: 'TypeScript', color: '#3178C6', symbol: 'TS' },
  { name: 'Node.js', color: '#339933', symbol: '⬢' },
  { name: 'PostgreSQL', color: '#336791', symbol: '🐘' },
  { name: 'Vercel', color: '#000000', symbol: '△' },
];

const TerminalLine: React.FC<{ text: string; delay: number }> = ({ text, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  
  const opacity = interpolate(
    frame,
    [delay, delay + 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const typewriterLength = interpolate(
    frame,
    [delay, delay + 60],
    [0, text.length],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        opacity,
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#22c55e',
        marginBottom: '8px',
      }}
    >
      <span style={{ color: '#6b7280' }}>$ </span>
      {text.slice(0, Math.floor(typewriterLength))}
      {typewriterLength < text.length && (
        <span
          style={{
            backgroundColor: '#22c55e',
            color: '#000',
            animation: 'blink 1s infinite',
          }}
        >
          |
        </span>
      )}
    </div>
  );
};

const FloatingTechIcon: React.FC<{
  tech: typeof techStack[0];
  index: number;
  totalCount: number;
}> = ({ tech, index, totalCount }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const entryDelay = 60 + index * 10;
  const progress = spring({
    frame: frame - entryDelay,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const angle = (index / totalCount) * Math.PI * 2;
  const radius = 120;
  const centerX = width / 2;
  const centerY = height / 2;

  const x = centerX + Math.cos(angle + frame * 0.02) * radius * progress;
  const y = centerY + Math.sin(angle + frame * 0.02) * radius * progress;

  const scale = interpolate(progress, [0, 1], [0, 1]);
  const rotation = interpolate(frame, [0, 240], [0, 360]);

  return (
    <div
      style={{
        position: 'absolute',
        left: x - 40,
        top: y - 40,
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '16px',
        border: `2px solid ${tech.color}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        transform: `scale(${scale}) rotate(${rotation * 0.1}deg)`,
        backdropFilter: 'blur(10px)',
        boxShadow: `0 8px 32px rgba(${parseInt(tech.color.slice(1, 3), 16)}, ${parseInt(tech.color.slice(3, 5), 16)}, ${parseInt(tech.color.slice(5, 7), 16)}, 0.3)`,
      }}
    >
      <div
        style={{
          fontSize: '24px',
          marginBottom: '4px',
        }}
      >
        {tech.symbol}
      </div>
      <div
        style={{
          fontSize: '10px',
          color: tech.color,
          fontWeight: 'bold',
          fontFamily: 'monospace',
        }}
      >
        {tech.name}
      </div>
    </div>
  );
};

const GridBackground: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundImage: `
          linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: interpolate(frame, [0, 30], [0, 0.3]),
        transform: `translate(${frame * 0.5}px, ${frame * 0.3}px)`,
      }}
    />
  );
};

export const TechStackAnimation: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
    },
  });

  const titleScale = spring({
    frame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
    },
  });

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        overflow: 'hidden',
      }}
    >
      <GridBackground />
      
      {/* Main Title */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: `translate(-50%, -50%) scale(${titleScale})`,
          opacity: titleOpacity,
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            background: 'linear-gradient(90deg, #22c55e, #10b981)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontFamily: 'monospace',
            margin: 0,
            textShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
          }}
        >
          Kosuke Template
        </h1>
        <p
          style={{
            fontSize: '18px',
            color: '#94a3b8',
            fontFamily: 'monospace',
            margin: '16px 0 0 0',
          }}
        >
          Production-ready Next.js stack
        </p>
      </div>

      {/* Terminal Section */}
      <div
        style={{
          position: 'absolute',
          bottom: '20%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          width: '600px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#ef4444',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#f59e0b',
              }}
            />
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: '#22c55e',
              }}
            />
          </div>
          <div
            style={{
              marginLeft: '16px',
              fontSize: '12px',
              color: '#6b7280',
              fontFamily: 'monospace',
            }}
          >
            kosuke-template
          </div>
        </div>
        
        <TerminalLine text="git clone https://github.com/your-repo/kosuke-template" delay={120} />
        <TerminalLine text="cd kosuke-template" delay={140} />
        <TerminalLine text="npm install" delay={160} />
        <TerminalLine text="npm run dev" delay={180} />
        <TerminalLine text="🚀 Ready to ship!" delay={200} />
      </div>

      {/* Floating Tech Icons */}
      {techStack.map((tech, index) => (
        <FloatingTechIcon
          key={tech.name}
          tech={tech}
          index={index}
          totalCount={techStack.length}
        />
      ))}

      {/* Particles Effect */}
      {Array.from({ length: 20 }).map((_, i) => {
        const particleDelay = i * 5;
        const x = interpolate(
          frame,
          [particleDelay, particleDelay + 240],
          [Math.random() * 800, Math.random() * 800]
        );
        const y = interpolate(
          frame,
          [particleDelay, particleDelay + 240],
          [600, -100]
        );
        const opacity = interpolate(
          frame,
          [particleDelay, particleDelay + 60, particleDelay + 180, particleDelay + 240],
          [0, 1, 1, 0]
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: '2px',
              height: '2px',
              backgroundColor: '#22c55e',
              borderRadius: '50%',
              opacity,
              boxShadow: '0 0 4px #22c55e',
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};