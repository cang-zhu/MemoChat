module.exports = {
  rootDir: '../../',
  testMatch: [
    '<rootDir>/tests/unit/frontend/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js'
  ],
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.js'],
  collectCoverageFrom: [
    'src/frontend/**/*.js',
    '!src/frontend/node_modules/**'
  ],
  coverageDirectory: '<rootDir>/tests/reports/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: 'tests/reports/junit',
      outputName: 'jest-results.xml'
    }]
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};