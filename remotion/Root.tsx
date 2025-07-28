import React from 'react';
import { Composition } from 'remotion';
import { TechStackAnimation } from './TechStackAnimation';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TechStackAnimation"
        component={TechStackAnimation}
        durationInFrames={240}
        fps={30}
        width={800}
        height={600}
      />
    </>
  );
};