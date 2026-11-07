import React from 'react';
import { Canvas } from '@react-three/fiber';

export const ThreeCanvas: React.FC<any> = ({ children, style, ...props }) => {
  return (
    <Canvas style={style} {...props}>
      {children}
    </Canvas>
  );
};

