const React = require('react');

const CameraView = React.forwardRef((props, ref) => {
  return React.createElement('View', props, props.children);
});

module.exports = {
  CameraView,
  useCameraPermissions: () => [{ granted: true }, () => Promise.resolve({ granted: true })],
};
