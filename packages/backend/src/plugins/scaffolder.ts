/*
 * Copyright 2020 Spotify AB
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

import {
  CookieCutter,
  createRouter,
  FilePreparer,
  GithubPreparer,
  GitlabPreparer,
  Preparers,
  Publishers,
  GithubPublisher,
  GitlabPublisher,
  CreateReactAppTemplater,
  Templaters,
  RepoVisilityOptions,
} from '@backstage/plugin-scaffolder-backend';
import { Octokit } from '@octokit/rest';
import { Gitlab } from '@gitbeaker/node';
import type { PluginEnvironment } from '../types';
import Docker from 'dockerode';

export default async function createPlugin({
  logger,
  config,
}: PluginEnvironment) {
  const cookiecutterTemplater = new CookieCutter();
  const craTemplater = new CreateReactAppTemplater();
  const templaters = new Templaters();
  templaters.register('cookiecutter', cookiecutterTemplater);
  templaters.register('cra', craTemplater);

  const filePreparer = new FilePreparer();
  const githubPreparer = new GithubPreparer();
  const gitlabPreparer = new GitlabPreparer(config);
  const preparers = new Preparers();

  preparers.register('file', filePreparer);
  preparers.register('github', githubPreparer);
  preparers.register('gitlab', gitlabPreparer);
  preparers.register('gitlab/api', gitlabPreparer);

  const publishers = new Publishers();

  const githubToken = config.getString('scaffolder.github.token');
  const repoVisibility = config.getString(
    'scaffolder.github.visibility',
  ) as RepoVisilityOptions;

  const githubClient = new Octokit({ auth: githubToken });
  const githubPublisher = new GithubPublisher({
    client: githubClient,
    token: githubToken,
    repoVisibility,
  });
  publishers.register('file', githubPublisher);
  publishers.register('github', githubPublisher);

  const gitLabConfig = config.getOptionalConfig('scaffolder.gitlab.api');

  if (gitLabConfig) {
    const gitLabToken = gitLabConfig.getString('token');
    const gitLabClient = new Gitlab({
      host: gitLabConfig.getOptionalString('baseUrl'),
      token: gitLabToken,
    });
    const gitLabPublisher = new GitlabPublisher(gitLabClient, gitLabToken);
    publishers.register('gitlab', gitLabPublisher);
    publishers.register('gitlab/api', gitLabPublisher);
  }

  const dockerClient = new Docker();
  return await createRouter({
    preparers,
    templaters,
    publishers,
    logger,
    dockerClient,
  });
}