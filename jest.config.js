module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  moduleNameMapper: {
    '^react-native$': '<rootDir>/__mocks__/react-native.js',
    '^react-native-svg$': '<rootDir>/__mocks__/react-native-svg.js',
    '^@react-native-async-storage/async-storage$': '<rootDir>/__mocks__/async-storage.js',
    '^expo-haptics$': '<rootDir>/__mocks__/expo-haptics.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^expo-router$': '<rootDir>/__mocks__/expo-router.js',
    '^react-native-safe-area-context$': '<rootDir>/__mocks__/safe-area-context.js',
    '^expo-status-bar$': '<rootDir>/__mocks__/expo-status-bar.js',
    '^expo-constants$': '<rootDir>/__mocks__/expo-constants.js',
    '^react-native-reanimated$': '<rootDir>/__mocks__/reanimated.js',
    '^react-native-google-mobile-ads$': '<rootDir>/__mocks__/google-mobile-ads.js',
    '^@react-three/fiber/native$': '<rootDir>/__mocks__/react-three-fiber.js',
    '^@react-three/fiber$': '<rootDir>/__mocks__/react-three-fiber.js',
    '^three/examples/(.*)$': '<rootDir>/__mocks__/three-examples.js',
    '^three$': '<rootDir>/__mocks__/three.js',
  },
};
