import { defineConfig } from "cypress";
//in node 22+ it will be possible to use native version import { glob } from 'node:fs';
import fg from 'fast-glob';
import { GenerateCtrfReport } from 'cypress-ctrf-json-reporter';

function splitTests(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
  // load control variables
  const chunksCount = parseInt(config.env.SPLIT);
  const currentChunk = parseInt(config.env.SPLIT_INDEX);
  const specPattern = config.env.SPEC;

  console.log(`Validating split params. Splits: ${chunksCount}, split index: ${currentChunk}, specs: ${specPattern}`);
  if (chunksCount > 1 && currentChunk > 0 && specPattern) {
    // validate numeric variables
    if (currentChunk > chunksCount) {
        throw new Error(
            `Invalid split index ${currentChunk}. It should be less than or equal to total splits ${chunksCount}`
        );
    }
    console.log(
        `Splitting is enabled. Chunks count requested: ${chunksCount}. Now processing  ${currentChunk}`
    );

    //in node 22+ it will be possible to use native version import { glob } from 'node:fs';
    //resolve all the spec files that match the pattern
    const specs = fg.sync(config.specPattern).sort();
    console.log(`Spec pattern matches total of ${specs.length} specs.`);

    //split the specs into chunks of the same size (except the last one)
    const chunkSize = Math.ceil(specs.length / chunksCount);
    console.log(`Splitting into ${chunksCount} chunks of size ${chunkSize} or less.`);
    let chunks: string[][] = [];
    let i = 0;

    while (i < specs.length) {
      chunks.push(specs.slice(i, i += chunkSize));
    }

    //change the spec pattern to the exact files list in the current chunk
    config.specPattern = chunks[currentChunk - 1];
    console.log(`Setting new spec pattern (${chunks[currentChunk - 1].length}): ${chunks[currentChunk - 1].join('\n')}`);
  } else {
    console.log(`Splitting is disabled. Using specified pattern: ${config.specPattern}`);
  }
}

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      //Splitting is done here. The following function is like our own micro-splitting plugin.
      splitTests(on, config);

      //JSON reporter - not needed for splitting itself, but handy to display merged results later
      new GenerateCtrfReport({
        on,
        outputFile: config.env.SPLIT_INDEX ? `ctrf-report-${config.env.SPLIT_INDEX}.json` : 'ctrf-report.json',
      });

      return config;
    },
  },
});
