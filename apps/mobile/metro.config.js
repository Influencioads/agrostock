// Metro config for an Expo app inside a pnpm monorepo.
// Watches the workspace root so shared @agrotraders/* packages are transpiled,
// and resolves modules from both the app and the workspace node_modules.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Claude Code's worktrees under .claude/ each carry a full node_modules copy;
// watching them blows up the file crawler on Windows. Playwright's web e2e
// output is the same hazard: a trace resource saved under a mangled
// "?\C:\…" path made the watcher's lstat throw UNKNOWN and killed Metro.
const prev = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
  /[\\/]\.claude[\\/]/,
  /[\\/](test-results|playwright-report)[\\/]/,
];

module.exports = config;
