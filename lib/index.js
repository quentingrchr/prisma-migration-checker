import * as core from '@actions/core';
import { Octokit } from '@octokit/action';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
// Initialisation de l'Octokit pour l'API GitHub
const octokit = new Octokit();
const [OWNER, REPOSITORY] = process.env.GITHUB_REPOSITORY.split('/');
// Fonction pour récupérer le numéro de la Pull Request
function getPullRequestId() {
    const eventData = fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8');
    const ev = JSON.parse(eventData);
    return ev.pull_request ? ev.pull_request.number : null;
}
// Fonction pour détecter une suppression de colonne ou table dans un fichier de migration
function detectTableOrColumnDrop(fileContent) {
    const dropRegex = /drop (table|column)/i;
    return dropRegex.test(fileContent);
}
// Fonction pour obtenir la liste des fichiers modifiés dans une PR
function getModifiedFiles() {
    const stdout = execSync('git diff --name-only HEAD^1 HEAD').toString().trim();
    return stdout.split('\n');
}
// Fonction principale de l'action
async function run() {
    try {
        const mainBranch = core.getInput('main-branch');
        const path = core.getInput('path');
        const message = core.getInput('message');
        const fail = core.getBooleanInput('fail');
        const warning = core.getBooleanInput('warning');
        const modifiedFiles = getModifiedFiles();
        // Filtre pour ne garder que les fichiers de migration Prisma
        const migrationFiles = modifiedFiles.filter((file) => file.startsWith(path) && file.endsWith('.sql'));
        let hasTableOrColumnDrop = false;
        // Parcourt chaque fichier de migration pour détecter une suppression de colonne ou table
        for (const file of migrationFiles) {
            const fileContent = fs.readFileSync(file, 'utf8');
            if (detectTableOrColumnDrop(fileContent)) {
                hasTableOrColumnDrop = true;
                break;
            }
        }
        if (hasTableOrColumnDrop) {
            core.warning('A table or column drop has been detected in the Prisma migration.');
            if (warning) {
                const pullRequestId = getPullRequestId();
                if (pullRequestId) {
                    // Post a comment on the Pull Request
                    await octokit.issues.createComment({
                        owner: OWNER,
                        repo: REPOSITORY,
                        issue_number: pullRequestId,
                        body: message,
                    });
                }
            }
            if (fail) {
                core.setFailed('Potentially unsafe Prisma migration detected.');
            }
        }
        else {
            core.info('No table or column drop detected in the Prisma migration.');
        }
    }
    catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}
run();
