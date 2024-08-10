import { defineConfig } from "cypress";
import fg from 'fast-glob';
import chunk from 'lodash/chunk';

function splitTests(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  const splitChunks = parseInt(config.env.SPLIT);
  const splitChunk = parseInt(config.env.SPLIT_INDEX);
  console.log(`Validating split params. Splits: ${splitChunks}, split index: ${splitChunk}`);
  if (splitChunks > 1 && splitChunk > 0 && config.env.SPEC) {
    if (splitChunk > splitChunks) {
        throw new Error(
            `Invalid split index ${splitChunk}. It should be less than or equal to total splits ${splitChunks}`
        );
    }
    console.log(
        `Splitting is enabled. Chunks requested: ${splitChunks}. Now processing  ${splitChunk}`
    );
    console.log(`Spec pattern: ${config.env.SPEC}`);
    const specs = fg.sync(config.specPattern).sort();
    console.log(`Spec pattern matches total of ${specs.length} specs.`);
    const chunkSize = Math.ceil(specs.length / splitChunks);
    console.log(`Splitting into ${splitChunks} chunks of avg size: ${chunkSize} specs.`);
    const chunks = chunk(specs, chunkSize);
    config.specPattern = chunks[splitChunk - 1];
    console.log(`Setting new spec pattern: ${chunks[splitChunk - 1].join('\n')}`);
  } else {
    console.log(`Splitting is disabled. Using specified pattern: ${config.specPattern}`);
  }
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      splitTests(on, config);
      return config;
    },
  },
});
