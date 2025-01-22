import { CdklabsTypeScriptProject } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const coverageThreshold = 95;

const project = new CdklabsTypeScriptProject({
  defaultReleaseBranch: 'main',
  name: '@cdklabs/cdk-atmosphere-client',
  projenrcTs: true,
  release: true,
  jestOptions: {
    jestConfig: {
      coverageThreshold: {
        statements: coverageThreshold,
        lines: coverageThreshold,
        functions: coverageThreshold,
        branches: coverageThreshold,
      },
      coveragePathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/test/',
      ],
    },
  },
  deps: ['aws4fetch', '@aws-sdk/credential-providers'],
  devDeps: ['jest-fetch-mock'],

  tsconfig: {
    compilerOptions: {
      skipLibCheck: true,
    },
  },

});

project.package.file.patch(JsonPatch.add('/jest/randomize', true));

project.synth();