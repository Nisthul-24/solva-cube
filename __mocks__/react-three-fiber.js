const React = require('react');

const Canvas = ({ children }) => React.createElement('div', null, children);
const useFrame = () => {};
const useThree = () => ({
  camera: {
    position: { set: () => {} },
    lookAt: () => {},
  },
  gl: {
    domElement: null,
  },
  scene: {},
});

module.exports = {
  Canvas,
  useFrame,
  useThree,
};

