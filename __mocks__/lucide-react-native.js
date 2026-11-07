const React = require('react');
module.exports = new Proxy({}, {
  get: () => (props) => React.createElement('svg', props, props?.children)
});

