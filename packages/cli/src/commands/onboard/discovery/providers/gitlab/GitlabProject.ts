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

import fetch from 'node-fetch';
import { GitlabFile } from './GitlabFile';
import { Repository, RepositoryFile } from '../types';

export type ProjectResponse = {
  id: string;
  name: string;
  description: string;
  owner: {
    username: string;
  };
  web_url: string;
};

type FileResponse = {
  path: string;
};

type BranchResponse = {
  default: boolean;
  name: string;
};

type FileContentResponse = {
  content: string;
};

export class GitlabProject implements Repository {
  #files: Promise<RepositoryFile[]> | undefined;

  constructor(
    private readonly project: ProjectResponse,
    private readonly apiBaseUrl: string,
    private readonly headers: { [name: string]: string },
  ) {}

  get url(): string {
    return this.project.web_url;
  }

  get name(): string {
    return this.project.name;
  }

  get owner(): string {
    return this.project.owner.username;
  }

  get description(): string {
    return this.project.description;
  }

  async files(): Promise<RepositoryFile[]> {
    this.#files ??= this.#getFiles();
    return this.#files;
  }

  async #getFiles() {
    const response = await fetch(
      `${this.apiBaseUrl}/projects/${this.project.id}/repository/tree`,
      { headers: this.headers },
    );
    const files: FileResponse[] = await response.json();
    const mainBranch = await this.#getMainBranch();

    return await Promise.all(
      files.map(async file => {
        const content = await this.#getFileContent(file.path, mainBranch);
        return new GitlabFile(file.path, content);
      }),
    );
  }

  async #getFileContent(path: string, mainBranch: string): Promise<string> {
    const response = await fetch(
      `${this.apiBaseUrl}/projects/${this.project.id}/repository/files/${path}?ref=${mainBranch}`,
      { headers: this.headers },
    );
    const { content }: FileContentResponse = await response.json();

    return Buffer.from(content, 'base64').toString('ascii');
  }

  async #getMainBranch(): Promise<string> {
    const response = await fetch(
      `${this.apiBaseUrl}/projects/${this.project.id}/repository/branches`,
      { headers: this.headers },
    );
    const branches: BranchResponse[] = await response.json();

    return branches.find(branch => branch.default)?.name ?? 'main';
  }
}
