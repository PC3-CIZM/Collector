module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],

  // On charge des variables d'env AVANT d'importer ton code (important pour env.ts)
  setupFiles: ["<rootDir>/src/test/jest.env.js"],

  // On garde aussi un setup après (vide pour l’instant, utile au Test 2)
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
};
