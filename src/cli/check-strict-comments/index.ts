#!/usr/bin/env node

import { getFilesCheckedByTs, getStrictFilePaths } from '../findStrictFiles';
import chalk from 'chalk';
import { waitWithSpinner } from '../waitWithSpinner';
import { notConfiguredError } from '../errorMessages';
import { getPluginConfig } from '../getPluginConfig';
import { insertIgnoreComment, removeIgnoreComment } from '../commentOperations';
import { getFilePathsWithErrors } from '../update-strict-comments/getFilePaths';
import { execFile } from 'child_process';

const isWorkspaceClean = (): Promise<boolean> => {
  return new Promise((resolve) => {
    let isWorkspaceClean = true;
    const childProcess = execFile('git', ['status', '--porcelain'], { cwd: process.cwd() });

    childProcess.stdout?.on('data', () => {
      isWorkspaceClean = false;
    });

    childProcess.on('close', () => {
      resolve(isWorkspaceClean);
    });
  });
};

const printResult = (notStrictFilePaths: string[], filesWithErrors: string[]) => {
  const numberOfIgnoreCommentsRemoved = notStrictFilePaths.length - filesWithErrors.length;
  if (numberOfIgnoreCommentsRemoved > 0) {
    console.log(
      chalk.yellow(`=> Removed strict ignore comments in ${numberOfIgnoreCommentsRemoved} files`),
    );
  } else {
    console.log(chalk.green('=> No strict ignore comments changed'));
  }
};

export const run = async () => {
  if (!(await waitWithSpinner(isWorkspaceClean, 'Checking if workspace is clean...'))) {
    console.log(
      chalk.red(
        'Your working directory is not clean! Please commit or stash your changes before trying again',
      ),
    );
    return;
  }

  const pluginConfig = await getPluginConfig();

  if (!pluginConfig) {
    console.log(chalk.red(notConfiguredError));
    process.exit(1);
    return;
  }

  const allFilePaths = await waitWithSpinner(
    getFilesCheckedByTs,
    'Looking for files checked by TS...',
  );
  console.log('# files in project:\t', allFilePaths.length);

  const strictFilePaths = getStrictFilePaths(allFilePaths, pluginConfig);
  console.log('# files already strict:\t', strictFilePaths.length);

  const notStrictFilePaths = allFilePaths.filter((el) => !strictFilePaths.includes(el));
  console.log('# files not strict:\t', notStrictFilePaths.length);

  notStrictFilePaths.forEach((filePath) => removeIgnoreComment(filePath));

  const erroredFilePaths = await getFilePathsWithErrors(notStrictFilePaths);
  console.log('# files with errors:\t', erroredFilePaths.length);

  erroredFilePaths.forEach((filePath) => insertIgnoreComment(filePath));

  printResult(notStrictFilePaths, erroredFilePaths);
};

run();
