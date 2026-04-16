module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/?(*.)+(spec|test).[tj]s?(x)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|@expo|expo-.*|@expo/.*|@react-navigation/.*)/)"
  ]
};
