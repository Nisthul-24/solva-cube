const React = require('react');
module.exports = {
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  Link: (props) => React.createElement('a', props, props?.children),
};

