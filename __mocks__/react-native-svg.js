const React = require('react');

const SvgComponent = (props) => React.createElement('svg', props, props.children);
const createElem = (tag) => (props) => React.createElement(tag, props, props.children);

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
};

