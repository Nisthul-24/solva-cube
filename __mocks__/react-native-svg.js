const React = require('react');

const cleanSvgProps = (props) => {
  if (!props) return {};
  const cleaned = { ...props };
  // Convert react-native-svg props to standard SVG/DOM attribute names or remove unsupported ones
  if (cleaned.stopColor !== undefined) {
    cleaned.stopColor = String(cleaned.stopColor);
  }
  if (cleaned.stopOpacity !== undefined) {
    cleaned.stopOpacity = String(cleaned.stopOpacity);
  }
  if (cleaned.strokeOpacity !== undefined) {
    cleaned.strokeOpacity = String(cleaned.strokeOpacity);
  }
  return cleaned;
};

const SvgComponent = (props) => React.createElement('svg', cleanSvgProps(props), props.children);
const createElem = (tag) => (props) => React.createElement(tag, cleanSvgProps(props), props.children);

module.exports = {
  __esModule: true,
  default: SvgComponent,
  Svg: SvgComponent,
  Circle: createElem('circle'),
  Path: createElem('path'),
  G: createElem('g'),
  Polygon: createElem('polygon'),
  Text: createElem('text'),
  Rect: createElem('rect'),
  Line: createElem('line'),
  Defs: createElem('defs'),
  LinearGradient: createElem('linearGradient'),
  RadialGradient: createElem('radialGradient'),
  Stop: createElem('stop'),
};
