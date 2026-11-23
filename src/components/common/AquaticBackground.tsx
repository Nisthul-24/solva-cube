import React, { memo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  RadialGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';

interface AquaticBackgroundProps {
  children?: React.ReactNode;
}

/**
 * Aquatic Bokeh Background
 * Renders a deep ocean teal gradient with translucent glossy bubbles,
 * specular crescent reflections, and subtle geometric wave / dot accents.
 */
export const AquaticBackground = memo(function AquaticBackground({
  children,
}: AquaticBackgroundProps) {
  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
        <Defs>
          {/* Main Deep Ocean Gradient */}
          <SvgLinearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#032B34" />
            <Stop offset="35%" stopColor="#023D4A" />
            <Stop offset="70%" stopColor="#014F5E" />
            <Stop offset="100%" stopColor="#006374" />
          </SvgLinearGradient>

          {/* Bubble Glow Gradient */}
          <RadialGradient id="bubbleGlow" cx="40%" cy="40%" r="60%">
            <Stop offset="0%" stopColor="#67E8F9" stopOpacity="0.45" />
            <Stop offset="50%" stopColor="#22D3EE" stopOpacity="0.2" />
            <Stop offset="85%" stopColor="#0891B2" stopOpacity="0.08" />
            <Stop offset="100%" stopColor="#0E7490" stopOpacity="0" />
          </RadialGradient>

          {/* Bright Specular Highlight */}
          <RadialGradient id="specularGlow" cx="30%" cy="30%" r="35%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="50%" stopColor="#CFFAFE" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#67E8F9" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Base Gradient Fill */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bgGrad)" />

        {/* Corner Abstract Wave Contours (Bottom Left) */}
        <G opacity="0.18">
          <Path
            d="M -40 600 Q 80 520, 160 620 T 320 600"
            stroke="#22D3EE"
            strokeWidth="2"
            fill="none"
          />
          <Path
            d="M -20 630 Q 100 550, 180 650 T 340 630"
            stroke="#22D3EE"
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d="M 0 660 Q 120 580, 200 680 T 360 660"
            stroke="#67E8F9"
            strokeWidth="1"
            fill="none"
          />
        </G>

        {/* Corner Dot Grid (Bottom Left) */}
        <G opacity="0.15">
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 6 }).map((__, c) => (
              <Circle
                key={`dot-${r}-${c}`}
                cx={20 + c * 16}
                cy={480 + r * 16}
                r="2"
                fill="#67E8F9"
              />
            ))
          )}
        </G>

        {/* Translucent Bokeh Bubbles with Gloss Reflections */}
        {/* Top Left Bubbles */}
        <G opacity="0.45">
          <Circle cx="8%" cy="12%" r="28" fill="url(#bubbleGlow)" />
          <Circle cx="7.2%" cy="10.8%" r="6" fill="url(#specularGlow)" />
          <Circle
            cx="8%"
            cy="12%"
            r="28"
            stroke="#A5F3FC"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            fill="none"
          />
        </G>
        <G opacity="0.35">
          <Circle cx="16%" cy="25%" r="14" fill="url(#bubbleGlow)" />
          <Circle cx="15.5%" cy="24%" r="3" fill="url(#specularGlow)" />
        </G>

        {/* Top Center-Right Large Bubble */}
        <G opacity="0.5">
          <Circle cx="68%" cy="14%" r="42" fill="url(#bubbleGlow)" />
          <Circle cx="66.5%" cy="11.5%" r="9" fill="url(#specularGlow)" />
          <Circle
            cx="68%"
            cy="14%"
            r="42"
            stroke="#A5F3FC"
            strokeWidth="1.2"
            strokeOpacity="0.4"
            fill="none"
          />
        </G>
        <G opacity="0.35">
          <Circle cx="79%" cy="9%" r="20" fill="url(#bubbleGlow)" />
          <Circle cx="78.5%" cy="8%" r="4" fill="url(#specularGlow)" />
        </G>

        {/* Far Right Bokeh Orbs */}
        <G opacity="0.4">
          <Circle cx="90%" cy="32%" r="55" fill="url(#bubbleGlow)" />
          <Circle cx="88.5%" cy="29%" r="12" fill="url(#specularGlow)" />
          <Circle
            cx="90%"
            cy="32%"
            r="55"
            stroke="#A5F3FC"
            strokeWidth="1.2"
            strokeOpacity="0.35"
            fill="none"
          />
        </G>
        <G opacity="0.3">
          <Circle cx="96%" cy="18%" r="30" fill="url(#bubbleGlow)" />
        </G>

        {/* Center / Ambient Soft Bokeh Floating Circles */}
        <Circle cx="50%" cy="40%" r="35" fill="url(#bubbleGlow)" opacity="0.25" />
        <Circle cx="58%" cy="65%" r="24" fill="url(#bubbleGlow)" opacity="0.3" />
        <Circle cx="57.5%" cy="63.5%" r="5" fill="url(#specularGlow)" opacity="0.4" />
        <Circle cx="35%" cy="75%" r="18" fill="url(#bubbleGlow)" opacity="0.3" />

        {/* Bottom Left Floating Bubble */}
        <G opacity="0.45">
          <Circle cx="4%" cy="68%" r="48" fill="url(#bubbleGlow)" />
          <Circle cx="3%" cy="64%" r="10" fill="url(#specularGlow)" />
          <Circle
            cx="4%"
            cy="68%"
            r="48"
            stroke="#A5F3FC"
            strokeWidth="1"
            strokeOpacity="0.35"
            fill="none"
          />
        </G>

        {/* Bottom Right Floating Bubbles */}
        <G opacity="0.4">
          <Circle cx="85%" cy="85%" r="38" fill="url(#bubbleGlow)" />
          <Circle cx="83.8%" cy="82.5%" r="8" fill="url(#specularGlow)" />
          <Circle
            cx="85%"
            cy="85%"
            r="38"
            stroke="#A5F3FC"
            strokeWidth="0.8"
            strokeOpacity="0.3"
            fill="none"
          />
        </G>
        <G opacity="0.3">
          <Circle cx="72%" cy="92%" r="22" fill="url(#bubbleGlow)" />
          <Circle cx="71.5%" cy="90.5%" r="4" fill="url(#specularGlow)" />
        </G>
      </Svg>
      </View>

      {/* Foreground Content */}
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
