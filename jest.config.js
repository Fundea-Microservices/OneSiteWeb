// Configuración de Jest para el proyecto Angular 20 (reemplaza Karma/Jasmine).
// Usa jest-preset-angular; los .spec.ts viven junto al código en src/.
/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/e2e/'],
  moduleFileExtensions: ['ts', 'html', 'js', 'json', 'mjs'],
  // Angular, ngx-toastr, lucide-angular, etc. se publican como ESM (.mjs);
  // hay que transformarlos (por defecto Jest ignora node_modules).
  transformIgnorePatterns: ['node_modules/(?!.*\\.mjs$)'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/app/onesite-ex/**/*.ts',
    'src/services/onesiteex-auth/**/*.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
};
