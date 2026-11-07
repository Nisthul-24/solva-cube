const React = require('react');
module.exports = {
  default: {
    View: (props) => React.createElement('div', props, props?.children),
    Text: (props) => React.createElement('span', props, props?.children),
  },
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  withTiming: (v) => v,
  withSpring: (v) => v,
  withRepeat: (v) => v,
};

