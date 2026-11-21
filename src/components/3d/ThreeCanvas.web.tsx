import React from 'react';
import { Canvas } from '@react-three/fiber';
import { StyleSheet } from 'react-native';

export const ThreeCanvas: React.FC<any> = ({ children, style, ...props }) => {
  const flatStyle = StyleSheet.flatten(style) || {};
  return (
    <Canvas
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        ...flatStyle,
      }}
      gl={{ alpha: true }}
      {...props}
    >
      {children}
    </Canvas>
  );
};
