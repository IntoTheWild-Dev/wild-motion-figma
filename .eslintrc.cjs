module.exports = {
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": [
    "@typescript-eslint",
    "react"
  ],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended"
  ],
  "env": {
    "browser": true,
    "es2020": true,
    "node": true
  },
  "settings": {
    "react": {
      "version": "detect"
    }
  },
  "rules": {
    // TypeScript rules
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-var-requires": "off",
    
    // React rules
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    
    // General rules
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "comma-dangle": ["error", "only-multiline"],
    "no-console": "warn",
    "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }]
  },
  "overrides": [
    {
      "files": ["*.tsx"],
      "rules": {
        "react/jsx-uses-react": "off",
        "react/jsx-uses-vars": "error"
      }
    }
  ]
};