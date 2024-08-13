import { defineConfig } from "cypress";
import fg from 'fast-glob';
import { GenerateCtrfReport } from 'cypress-ctrf-json-reporter';

function splitTests(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  const chunksCount = parseInt(config.env.SPLIT);
  const currentChunk = parseInt(config.env.SPLIT_INDEX);
  const specPattern = config.env.SPEC;
  console.log(`Validating split params. Splits: ${chunksCount}, split index: ${currentChunk}, specs: ${specPattern}`);
  if (chunksCount > 1 && currentChunk > 0 && specPattern) {
    if (currentChunk > chunksCount) {
        throw new Error(
            `Invalid split index ${currentChunk}. It should be less than or equal to total splits ${chunksCount}`
        );
    }
    console.log(
        `Splitting is enabled. Chunks requested: ${chunksCount}. Now processing  ${currentChunk}`
    );
    console.log(`Spec pattern: ${specPattern}`);
    const specs = fg.sync(config.specPattern).sort();
    //in node 22+ it will be possible to use native version import { glob } from 'node:fs';
    console.log(`Spec pattern matches total of ${specs.length} specs.`);
    const chunkSize = Math.ceil(specs.length / chunksCount);
    console.log(`Splitting into ${chunksCount} chunks of size ${chunkSize} or less.`);
    let chunks: string[][] = [];
    let i = 0;

    while (i < specs.length) {
      chunks.push(specs.slice(i, i += chunkSize));
    }

    // const chunks = chunk(specs, chunkSize);
    config.specPattern = chunks[currentChunk - 1];
    console.log(`Setting new spec pattern (${chunks[currentChunk - 1].length}): ${chunks[currentChunk - 1].join('\n')}`);
  } else {
    console.log(`Splitting is disabled. Using specified pattern: ${config.specPattern}`);
  }
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      splitTests(on, config);

      new GenerateCtrfReport({
        on,
      });

      return config;
    },
  },
});
