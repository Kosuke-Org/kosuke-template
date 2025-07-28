'use client';

import { Player } from '@remotion/player';
import { TechStackAnimation } from '../../../../remotion/TechStackAnimation';

export const RemotionPlayer: React.FC = () => {
  return (
    <div className="flex justify-center items-center">
      <div className="rounded-xl overflow-hidden border border-border/50 shadow-2xl bg-card/50 backdrop-blur-sm">
        <Player
          component={TechStackAnimation}
          durationInFrames={240}
          compositionWidth={800}
          compositionHeight={600}
          fps={30}
          controls
          autoPlay
          loop
          style={{
            width: '100%',
            maxWidth: '800px',
            height: 'auto',
          }}
        />
      </div>
    </div>
  );
};