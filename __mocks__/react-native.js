const React = require('react');

function cleanProps(props) {
  if (!props) return {};
  const {
    accessibilityRole,
    contentContainerStyle,
    showsVerticalScrollIndicator,
    showsHorizontalScrollIndicator,
    activeOpacity,
    ...rest
  } = props;
  return rest;
}

module.exports = {
  Platform: {
    OS: 'web',
    select: (obj) => obj.web || obj.default,
  },
  StyleSheet: {
    create: (styles) => styles,
    absoluteFill: {},
  },
  View: (props) => React.createElement('div', cleanProps(props), props?.children),
  Text: (props) => React.createElement('span', cleanProps(props), props?.children),
  TouchableOpacity: (props) => React.createElement('button', cleanProps(props), props?.children),
  Pressable: (props) => React.createElement('button', cleanProps(props), props?.children),
  ScrollView: (props) => React.createElement('div', cleanProps(props), props?.children),
  Modal: (props) => React.createElement('div', cleanProps(props), props?.children),
  ActivityIndicator: (props) => React.createElement('div', cleanProps(props), props?.children),
  TextInput: (props) => React.createElement('input', cleanProps(props)),
  Switch: (props) => React.createElement('input', { type: 'checkbox', ...cleanProps(props) }),
  Touchable: { Mixin: {} },
  PanResponder: {
    create: () => ({ panHandlers: {} }),
  },
  Dimensions: {
    get: () => ({ width: 375, height: 667 }),
  },
  useWindowDimensions: () => ({ width: 375, height: 667, scale: 1, fontScale: 1 }),
  Alert: {
    alert: jest.fn(),
  },
};
