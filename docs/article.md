If you have multiple runners available (like 20 concurrent jobs on the GitHub [Free tier](https://docs.github.com/en/actions/administering-github-actions/usage-limits-billing-and-administration#usage-limits)), you can speed up end-to-end tests by easily distributing them across these runners.

Easily with [Playwright](https://playwright.dev/) for example, but more on that later. **Things are a bit more complicated with Cypress, and you have to be** **more creative**. Let me show you how in a simple example.

### Example application

I've created a basic next.js app with two pages:

* the counter page


![The counter page](https://github.com/user-attachments/assets/bf0652a7-4138-4e29-b8f9-92dc968cbc8a align="center")

* the items list page

  ![](https://github.com/user-attachments/assets/318255b2-9239-437d-a810-c2feb987be69 align="center")


And I covered them with [e2e Cypress tests](https://github.com/roamingowl/cypress-split-example/tree/main/cypress/e2e/1).

Example for the counter page:

```typescript
describe("Counter Page", () => {
    function openPage() {
        cy.visit(Cypress.env('NEXT_APP_URL'));
        cy.get("[data-test-name=sidebar-hamburger]").click();
        cy.get("[data-sidebar-link-name=counter]").click();
    }

    it("displays counter and two buttons", () => {
        openPage();
        cy.get("[data-test-name=counter-title]").should("have.text", "Count");
        cy.get("[data-test-name=count-number]").should("have.text", "0");
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.disabled");
    })

    it("count up", () => {
        openPage();
        for (let i = 0; i < 3; i++) {
            cy.get("[data-test-name=count-number]").should("have.text", `${i}`);
            cy.get("[data-test-name=count-up]").click();
        }
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.enabled");
    })

    it("count up and down", () => {
        openPage();
        cy.get("[data-test-name=count-number]").should("have.text", `0`);
        cy.get("[data-test-name=count-up]").click();
        cy.get("[data-test-name=count-number]").should("have.text", `1`);
        cy.get("[data-test-name=count-up]").should("be.enabled");
        cy.get("[data-test-name=count-down]").should("be.enabled");
        cy.get("[data-test-name=count-down]").click();
        cy.get("[data-test-name=count-number]").should("have.text", `0`);
        cy.get("[data-test-name=count-down]").should("be.disabled");
    })
})
```

Check out all the tests [here](https://github.com/roamingowl/cypress-split-example/tree/main/cypress/e2e/1).

Running it all together serially is pretty straightforward. Check [cypress-serial.yml](https://github.com/roamingowl/cypress-split-example/blob/main/.github/workflows/cypress-serial.yaml) workflow in the example GitHub project.

Workflow explanation:

* start next.js app (using `docker compose` and prebuilt image)

* there are only `two` test suites with `6` tests - so [I duplicated them 20x](https://github.com/roamingowl/cypress-split-example/blob/main/.github/actions/multiply-tests/action.yaml) to simulate longer-running tests (`120` tests total)

* setup node/npm (GitHub action)

* run Cypress using the smallest `cypress/included` Cypress [docker image](https://hub.docker.com/r/cypress/included)

* print the results in a summary using [github-actions-test-reporter-ctrf](https://github.com/ctrf-io/github-actions-test-reporter-ctrf) action


A few notes here:

* I'm using a prebuilt image from [`ghcr.io`](http://ghcr.io) which is built by [another manual workflow](https://github.com/roamingowl/cypress-split-example/blob/main/.github/workflows/build-image.yaml) to speed things up

* Cypress tests stats are gathered by [https://github.com/ctrf-io/playwright-ctrf-json-report](https://github.com/ctrf-io/playwright-ctrf-json-report)


![image](https://github.com/user-attachments/assets/940e678d-cfc7-4171-9ce9-3cffd64b9d43 align="center")

The resulting time is about `~5 minutes` which is split between:

* **environment setup** `~ 1.5 min` - a constant which will always be spent no matter how many runners we split the tests to

* **running cypress** `~ 3.5 min` (120 tests)


Tests Summary table:

| Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 120 | 120 | 0 | 0 | 0 | 0 | 0 | 00:03:27 |

# Splitting Cypress tests

Obviously, Cypress supports [parallelism](https://docs.cypress.io/guides/cloud/smart-orchestration/parallelization). The only problem is that you have to use their (paid) cloud solution [cypress.io](http://cypress.io) to be able to use it. It is a great service, no doubt, but it might be overkill for some scenarios.

There is a famous [cypress-split](https://github.com/bahmutov/cypress-split#readme) that can do it all and more, like splitting based on [time](https://github.com/bahmutov/cypress-split?tab=readme-ov-file#split-specs-based-on-timings), etc.

But if you just need a simple split based on spec files, it can be achieved easily with just a few lines of code and no extra dependencies (or maybe one 😉).

Here is how to do it with GitHub actions.

### Switch specs definition to env variable

Let's start by switching the specs definition from cypress cli parameter `--spec` to the env variable like `SPEC`.

The reason for that is, that we can't override spec pattern defined with `--spec` cli parameter in Cypress config.

So we need to change the run command from something like this:

```bash
cypress run --spec cypress/e2e/**/*.cy.ts
```

To something like this:

```plaintext
CYPRESS_SPEC=cypress/e2e/**/*.cy.ts cypress run
```

### Add splits control variables

Now let's define how we want to split resolved spec files. **The simplest** way would be to split them into a number of chunks of the same (or smaller) size. Each chunk will run on its own independent runner. Let's define two more variables:

* `CYPRESS_SPLIT_INDEX` - which will represent the number of the chunk we want to execute. This will be a number between 1 and the number defined in next variable

* `CYPRESS_SPLIT` - which will define the total number of chunks.


So to run 1st chunk (out of 2) of cypress tests we'd run command like:

```bash
CYPRESS_SPLIT=2 CYPRESS_SPLIT_INDEX=1 CYPRESS_SPEC=cypress/e2e/**/*.cy.ts cypress run
```

### Splitting logic

The most simple example would look like this in [cypress.config.ts](https://github.com/roamingowl/cypress-split-example/blob/eeb1f0f8c707cf988645708394f1e24b62e675e6/cypress.config.ts#L43):

```ts
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
```

Notes:

* We still need to add a pattern matching library like `fast-glob` (or anything else that suits your needs) to be able to resolve the full files list from the pattern. However, in node `22+` it will be possible to use glob directly like `import { glob } from 'node:fs';` and no dependency will be necessary.

* I use [cypress-ctrf-json-reporter](https://github.com/ctrf-io/playwright-ctrf-json-report) to generate JSON reports. Which can be later easily merged into one nice markdown summary report.

* All cypress-related env variables have to be prefixed with the `CYPRESS_` prefix and are referenced in the code without it. So `CYPRESS_SPLIT_INDEX` will become `config.env.SPLIT_INDEX` in the code.


### Putting it all together

Check the full working example repository [here](https://github.com/roamingowl/cypress-split-example).

The last thing we need to do is to update [github workflow](https://github.com/roamingowl/cypress-split-example/blob/main/.github/workflows/cypress-split.yaml) to use [matrix strategy](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow#using-a-matrix-strategy):

```yaml
#...snip...
    cypress-parallel:
        strategy:
            matrix:
# let's split the tests into 3 chunks
              split_index: [1, 2, 3]
        name: Cypress
        runs-on: ubuntu-latest
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Docker GitHub auth
            uses: docker/login-action@v3
            with:
              registry: ghcr.io
              username: token
              password: ${{ secrets.WRITE_PACKAGES_TOKEN }}

          - name: Run compose
            run: |
                docker compose up -d

          - uses: actions/setup-node@v4
            with:
              node-version: 20

          - name: Get npm cache directory
            id: npm-cache-dir
            shell: bash
            run: echo "dir=$(npm config get cache)" >> ${GITHUB_OUTPUT}

          - uses: actions/cache@v4
            id: npm-cache # use this to check for `cache-hit` ==> if: steps.npm-cache.outputs.cache-hit != 'true'
            with:
              path: ${{ steps.npm-cache-dir.outputs.dir }}
              key: cy-split-${{ runner.name }}${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
              restore-keys: |
                cy-split-${{ runner.os }}-node-

# multiply tests to have 120 in total
          - uses: ./.github/actions/multiply-tests
            with:
              count: 20

          - run: npm i

# run just a specific chunk defined by matrix.split_index variable
          - name: Run cypress
            env:
              CYPRESS_SPLIT_INDEX: ${{ matrix.split_index }}
              CYPRESS_SPLIT: 3
              CYPRESS_NEXT_APP_URL: http://next-app:3000
              CYPRESS_SPEC: cypress/e2e/**/*.cy.ts
            run: |
                docker compose run --rm cypress

# generate JSON results
          - name: Upload reports' artifacts
            if: success() || failure()
            uses: actions/upload-artifact@v4
            with:
              name: cypress_parale_artifact_${{ matrix.split_index }}
              if-no-files-found: ignore
              path: ctrf/*.json
              retention-days: 1

# merge the results into one nice single markdownw table
    results:
        runs-on: ubuntu-latest
        if: always()
        needs: cypress-parallel
        steps:
          - uses: actions/checkout@v4

          - name: Download reports artifacts
            uses: actions/download-artifact@v4
            with:
              path: downloaded_artifacts

          - name: Publish CTRF Test Summary Results
            run: |
              ls -al downloaded_artifacts/cypress_parale_artifact_1
              mkdir -p ctrf
              cp -v downloaded_artifacts/*/*.json ctrf
              npx ctrf merge ctrf
              npx github-actions-ctrf summary ctrf/ctrf-report.json
```

Breaking it down:

Split the tests into 3 chunks of the same size (~40 tests each):

```yaml
strategy:
  matrix:
    split_index: [1, 2, 3]
```

Run the tests and pass chunk number from `matrix.split_index`.

The total number of chunks is hardcoded to static number `3` here (yes this can be improved):

```yaml
 - name: Run cypress
   env:
     CYPRESS_SPLIT_INDEX: ${{ matrix.split_index }}
     CYPRESS_SPLIT: 3
     CYPRESS_NEXT_APP_URL: http://next-app:3000
     CYPRESS_SPEC: cypress/e2e/**/*.cy.ts
   run: |
     docker compose run --rm cypress
```

After we wait for all the jobs to complete, we can easily merge and render the results with the help of [ctrf](https://github.com/ctrf-io/ctrf) and [github-actions-test-reporter-ctrf](https://github.com/ctrf-io/github-actions-test-reporter-ctrf) action in one single table:

```yaml
    results:
        runs-on: ubuntu-latest
        if: always()
        needs: cypress-paralel
        steps:
          - uses: actions/checkout@v4

          - name: Download reports artifacts
            uses: actions/download-artifact@v4
            with:
              path: downloaded_artifacts

          - name: Publish CTRF Test Summary Results
            run: |
              ls -al downloaded_artifacts/cypress_parale_artifact_1
              mkdir -p ctrf
              cp -v downloaded_artifacts/*/*.json ctrf
              npx ctrf merge ctrf
              npx github-actions-ctrf summary ctrf/ctrf-report.json
```

Resulting table:

| Tests 📝 | Passed ✅ | Failed ❌ | Skipped ⏭️ | Pending ⏳ | Other ❓ | Flaky 🍂 | Duration ⏱️ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 120 | 120 | 0 | 0 | 0 | 0 | 0 | 00:01:17 |

Notice the time difference from the serial run:

| Serial run | Parallel run (3 runners) |
| --- | --- |
| 00:03:27 🐌 | 00:01:17 😎 |

Not bad for such a small change!

## Appendix 1: Splitting tests with Playwright 😎

In case you were wondering how it can be done with Playwright... It **supports splitting out of the box**. They call it [sharding](https://playwright.dev/docs/test-sharding)!

No need to fiddle with tests or plugins or anything like that. Just update your GitHub workflow to use the matrix like this:

```yaml
# Define your matrix
jobs:
    playwright-paralel:
        strategy:
            matrix:
              split_index: [1, 2, 3]
    steps:
# Then later just use the matrix variable
     - name: Run playwright
          env:
            NEXT_APP_URL: http://localhost:3000
            SPLIT_INDEX: ${{matrix.split_index}}
          run: |
            npx playwright test  --shard=${{matrix.split_index}}/3
```

See the full working examples here:

* playwright example with [one job for all tests](https://github.com/roamingowl/playwright-split-example/blob/main/.github/workflows/playwright-serial.yaml)

* playwright example with [tests split into 3 parallel jobs](https://github.com/roamingowl/playwright-split-example/blob/main/.github/workflows/playwright-split.yaml)


A few notes for the Playwright repo:

* an example app and tets are the same as in Cypress repo

* results are again gathered by [ctrf playwright plugin](https://github.com/ctrf-io/playwright-ctrf-json-report), merged with [ctrf cli](https://github.com/ctrf-io/ctrf) and rendered using [github-actions-test-reporter-ctrf](https://github.com/ctrf-io/github-actions-ctrf) GitHub action.