const React = require('react');
module.exports = {
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useFocusEffect: (cb) => {
    React.useEffect(() => {
      const cleanup = cb();
      return () => cleanup && cleanup();
    }, [cb]);
  },
  Link: (props) => React.createElement('a', props, props?.children),
};

