const React = require('react');

const SvgComponent = (props) => React.createElement('svg', props, props.children);
const ElementComponent = (props) => React.createElement('g', props, props.children);

module.exports = {
  __esModule: true,
  default: SvgComponent,
  Svg: SvgComponent,
  Circle: ElementComponent,
  Path: ElementComponent,
  G: ElementComponent,
  Polygon: ElementComponent,
  Text: ElementComponent,
  Rect: ElementComponent,
  Line: ElementComponent,
};

