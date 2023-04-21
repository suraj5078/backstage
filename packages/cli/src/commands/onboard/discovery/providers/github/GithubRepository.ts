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

import { graphql } from '@octokit/graphql';
import {
  Repository as GraphqlRepository,
  Tree as GraphqlTree,
  Blob as GraphqlBlob,
} from '@octokit/graphql-schema';
import { Repository, RepositoryFile } from '../types';
import { RepositoryResponse } from './graphql';
import { GithubFile } from './GithubFile';

export class GithubRepository implements Repository {
  readonly #client: typeof graphql;
  readonly #repo: RepositoryResponse;
  readonly #org: string;
  #files: Promise<RepositoryFile[]> | undefined;

  constructor(client: typeof graphql, repo: RepositoryResponse, org: string) {
    this.#client = client;
    this.#repo = repo;
    this.#org = org;
  }

  get url(): string {
    return this.#repo.url;
  }

  get name(): string {
    return this.#repo.name;
  }

  get owner(): string {
    return this.#org;
  }

  get description(): string | undefined {
    return this.#repo.description;
  }

  files(): Promise<RepositoryFile[]> {
    this.#files ??= this.#doGetFiles();
    return this.#files;
  }

  async #doGetFiles(): Promise<RepositoryFile[]> {
    const query = `query RepoFiles($owner: String!, $name: String!) {
        repository(owner: $owner, name: $name) {
          object(expression: "HEAD:") {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Blob {
                    byteSize
                    text
                    isBinary
                  }
                }
              }
            }
          }
        }
      }
      `;

    const response = await this.#client<{ repository: GraphqlRepository }>(
      query,
      {
        name: this.#repo.name,
        owner: this.#org,
      },
    );

    const tree = response.repository.object;
    if (tree) {
      return (
        (tree as GraphqlTree).entries
          ?.filter(
            e => e.type === 'blob' && !(e.object as GraphqlBlob).isBinary,
          )
          .map(
            e => new GithubFile(e.name, (e.object as GraphqlBlob).text ?? ''),
          ) ?? []
      );
    }
    return [];
  }
}
