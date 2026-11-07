const React = require('react');

module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    absoluteFill: {},
  },
  View: (props) => React.createElement('div', props, props.children),
  Text: (props) => React.createElement('span', props, props.children),
  TouchableOpacity: (props) => React.createElement('button', props, props.children),
  Touchable: { Mixin: {} },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
  },
};
