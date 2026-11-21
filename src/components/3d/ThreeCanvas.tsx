import React from 'react';
import { Canvas } from '@react-three/fiber/native';

export const ThreeCanvas: React.FC<any> = ({ children, style, gl, onCreated, ...props }) => {
  return (
    <Canvas
      style={[{ backgroundColor: 'transparent' }, style]}
      gl={{ alpha: true, ...gl }}
      onCreated={(state: any) => {
        try {
          state.gl.setClearColor(0x000000, 0);
        } catch {}
        if (onCreated) onCreated(state);
      }}
      {...props}
    >
      {children}
    </Canvas>
  );
};
