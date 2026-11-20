export interface PackageLicense {
  name: string;
  version: string;
  license: string;
  author: string;
  repository?: string;
}

export const OPEN_SOURCE_LICENSES: PackageLicense[] = [
  {
    name: 'react',
    version: '18.3.1',
    license: 'MIT',
    author: 'Meta Platforms, Inc.',
    repository: 'https://github.com/facebook/react',
  },
  {
    name: 'react-native',
    version: '0.76.9',
    license: 'MIT',
    author: 'Meta Platforms, Inc.',
    repository: 'https://github.com/facebook/react-native',
  },
  {
    name: 'three',
    version: '0.187.0',
    license: 'MIT',
    author: 'Ricardo Cabello (mrdoob) and contributors',
    repository: 'https://github.com/mrdoob/three.js',
  },
  {
    name: '@react-three/fiber',
    version: '8.17.10',
    license: 'MIT',
    author: 'Paul Henschel and Poimandres',
    repository: 'https://github.com/pmndrs/react-three-fiber',
  },
  {
    name: 'expo',
    version: '52.0.0',
    license: 'MIT',
    author: '650 Industries, Inc.',
    repository: 'https://github.com/expo/expo',
  },
  {
    name: 'expo-gl',
    version: '15.0.5',
    license: 'MIT',
    author: '650 Industries, Inc.',
    repository: 'https://github.com/expo/expo',
  },
  {
    name: 'react-native-google-mobile-ads',
    version: '14.8.0',
    license: 'Apache-2.0',
    author: 'Invertase Limited',
    repository: 'https://github.com/invertase/react-native-google-mobile-ads',
  },
  {
    name: 'react-native-svg',
    version: '15.8.0',
    license: 'MIT',
    author: 'Horcrux and Software Mansion',
    repository: 'https://github.com/software-mansion/react-native-svg',
  },
  {
    name: 'lucide-react-native',
    version: '0.468.0',
    license: 'ISC',
    author: 'Lucide Project',
    repository: 'https://github.com/lucide-icons/lucide',
  },
  {
    name: 'zustand',
    version: '5.0.2',
    license: 'MIT',
    author: 'Paul Henschel and contributors',
    repository: 'https://github.com/pmndrs/zustand',
  },
  {
    name: '@react-native-async-storage/async-storage',
    version: '1.23.1',
    license: 'MIT',
    author: 'React Native Community',
    repository: 'https://github.com/react-native-async-storage/async-storage',
  },
  {
    name: 'cubejs',
    version: '1.0.4',
    license: 'MIT',
    author: 'Lutz Tautenhahn',
    repository: 'https://github.com/ldez/cubejs',
  },
];

