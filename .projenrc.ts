import { CdklabsJsiiProject } from 'cdklabs-projen-project-types';
import { JsonPatch } from 'projen';

const coverageThreshold = 95;

const project = new CdklabsJsiiProject({
  author: 'AWS',
  authorAddress: 'aws-cdk-dev@amazon.com',
  defaultReleaseBranch: 'main',
  name: '@cdklabs/cdk-atmosphere-client',
  projenrcTs: true,
  release: false,
  repositoryUrl: 'https://github.com/cdklabs/cdk-atmosphere-client.git',
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

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});

project.package.file.patch(JsonPatch.add('/jest/randomize', true));

project.synth();