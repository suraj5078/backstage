/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from 'fs-extra';
import yaml from 'yaml';
import inquirer from 'inquirer';
import { loadCliConfig } from '../../../lib/config';
import { updateConfigFile } from '../config';
import { APP_CONFIG_FILE, EXAMPLE_CATALOG_FILE } from '../files';
import { Discovery } from './Discovery';
import { BasicRepositoryEntityAnalyzer } from './analyzers/BasicRepositoryEntityAnalyzer';
import { PackageJsonAnalyzer } from './analyzers/PackageJsonAnalyzer';
import { GithubDiscoveryProvider } from './providers/github/GithubDiscoveryProvider';
import { GitlabDiscoveryProvider } from './providers/gitlab/GitlabDiscoveryProvider';
import { GitHubAnswers, GitLabAnswers } from '../auth';
import { CodeownersAnalyzer } from './analyzers/CodeownersAnalyzer';
import { Task } from '../../../lib/tasks';

export async function discover(providerInfo?: {
  provider: string;
  answers: GitHubAnswers | GitLabAnswers;
}) {
  const answers = await inquirer.prompt<{
    provider: string;
    shouldUsePreviousProvider: boolean;
    url: string;
  }>([
    {
      type: 'confirm',
      name: 'shouldUsePreviousProvider',
      message: `Do you want to keep using ${providerInfo?.provider} as your provider when setting up Software Catalog?`,
      when: () => providerInfo?.provider,
    },
    {
      type: 'list',
      name: 'provider',
      message: 'Please select an provider:',
      choices: ['GitHub', 'GitLab'],
      when: ({ shouldUsePreviousProvider }) => !shouldUsePreviousProvider,
    },
    {
      type: 'input',
      name: 'url',
      message: 'What is your URL',
      validate: (input: string) => Boolean(new URL(input)),
    },
  ]);

  const { fullConfig: config } = await loadCliConfig({
    args: [], // process.argv.slice(1),
    // fromPackage: '@backstage/cli',
    mockEnv: true,
    fullVisibility: true,
  });

  const discovery = new Discovery();

  if (answers.provider === 'GitHub') {
    discovery.addProvider(GithubDiscoveryProvider.fromConfig(config));
  }
  if (answers.provider === 'GitLab') {
    discovery.addProvider(GitlabDiscoveryProvider.fromConfig(config));
  }

  discovery.addAnalyzer(new BasicRepositoryEntityAnalyzer());
  discovery.addAnalyzer(new PackageJsonAnalyzer());
  discovery.addAnalyzer(new CodeownersAnalyzer());

  const { entities } = await discovery.run(answers.url);

  if (!entities.length) {
    Task.log('Nothing found unfortunately');
    return;
  }

  const payload: string[] = [];
  for (const entity of entities) {
    Task.forItem('Adding', entity.metadata.name, async () => {
      payload.push(`---\n${yaml.stringify(entity)}`);
    });
  }
  await fs.writeFile(EXAMPLE_CATALOG_FILE, payload.join());
  Task.log('Wrote example.yaml');

  await updateConfigFile(APP_CONFIG_FILE, {
    catalog: {
      locations: [
        {
          type: 'file',
          target: EXAMPLE_CATALOG_FILE,
        },
      ],
    },
  });
}
