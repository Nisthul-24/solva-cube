module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
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
    '^@react-three/fiber/native$': '<rootDir>/__mocks__/react-three-fiber.js',
    '^@react-three/fiber$': '<rootDir>/__mocks__/react-three-fiber.js',
    '^three/examples/(.*)$': '<rootDir>/__mocks__/three-examples.js',
    '^three$': '<rootDir>/__mocks__/three.js',
  },
};
