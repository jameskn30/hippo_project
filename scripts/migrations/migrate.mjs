import { spawnSync } from "node:child_process";
import { accessSync, constants, lstatSync, readFileSync, readdirSync, statSync } from "node:fs";
import { constants as osConstants } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as util from "node:util";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const dbmatePackage = "dbmate@2.36.0";
const databaseKey = "HIPPO_MIGRATION_DATABASE_URL";

const usage = `Usage: node scripts/migrations/migrate.mjs <install|check|run|report> [--env-file PATH]

  install  Download/cache the pinned dbmate npm package and print its version.
  check    Validate configuration and filesystem access without opening SQLite.
  run      Create the configured database if missing and apply pending SQL.
  report   Show applied and pending SQL migrations with dbmate status.

Configuration defaults to the repository's .env.migrations.
Set HIPPO_MIGRATION_DATABASE_URL and MIGRATION_SRC_PATH in that file.
Exported variables with those names override their file values.
Relative --env-file paths resolve from the caller's directory.
Install does not require database configuration. Node.js 20.12+ and npm are required.`;

/**
 * Stop with an actionable message.
 * @param {string} message Explanation shown to the user.
 * @param {number} [exitCode=1] CLI failure status; 2 means invalid arguments.
 * @returns {never}
 */
function fail(message, exitCode = 1) {
  const error = new Error(message);
  error.exitCode = exitCode;
  throw error;
}

/**
 * Parse literal, single-line dotenv assignments without executing the file.
 * @param {string} envFile Configuration file path.
 * @returns {Record<string, string>} Parsed keys and values.
 */
function readConfiguration(envFile) {
  if (typeof util.parseEnv !== "function") {
    fail("Node.js 20.12 or newer is required for migration preflight.");
  }

  let content;
  try {
    if (!statSync(envFile).isFile()) fail("Not a regular file.");
    content = readFileSync(envFile, "utf8").replace(/^\uFEFF/, "");
  } catch (error) {
    fail(`Cannot read configuration ${envFile}: ${error.message}`);
  }

  // Accept literal, single-line dotenv assignments; never execute the file.
  const assignment = /^(?:export[ \t]+)?([A-Za-z_]\w*)[ \t]*=[ \t]*(?:"(?:[^"\\]|\\.)*"|'[^']*'|[^#'"\r\n]*)[ \t]*(?:#.*)?$/;
  const keys = new Set();
  for (const [index, originalLine] of content.split(/\r?\n/).entries()) {
    const line = originalLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = assignment.exec(line);
    if (!match || line.includes("\0")) {
      fail(`Invalid configuration at ${envFile}:${index + 1}. Use a single-line KEY=VALUE assignment with matching quotes.`);
    }
    if (keys.has(match[1])) {
      fail(`Duplicate ${match[1]} at ${envFile}:${index + 1}. Keep one assignment per key.`);
    }
    keys.add(match[1]);
  }
  return util.parseEnv(content);
}

/**
 * Check the SQLite URL and filesystem access without opening the database.
 * @param {string} value Nonempty, literal SQLite file URL.
 * @param {string} source Setting's origin, used in error messages.
 * @returns {string} SQLite URL containing an absolute database path.
 */
function validateDatabaseURL(value, source) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail(`${databaseKey} in ${source} is not a valid URL. Use sqlite:/absolute/path/hippo.sqlite3.`);
  }
  if (!["sqlite:", "sqlite3:"].includes(url.protocol) || url.host || url.search || url.hash || /[?#]/.test(value)) {
    fail(`${databaseKey} in ${source} must be a local sqlite: or sqlite3: file URL without a host, query, or fragment.`);
  }

  let path;
  try {
    path = decodeURIComponent(url.pathname);
  } catch {
    fail(`${databaseKey} in ${source} has invalid URL encoding.`);
  }
  if (!path || path.endsWith("/") || path === ":memory:" || path.startsWith("file:") || path.startsWith("~") || /[\x00-\x1f\x7f%?#]/.test(path)) {
    fail(`${databaseKey} in ${source} must name a database file. Use a literal path without ~, %, ?, or #; memory and file: URI targets are unsupported.`);
  }

  const databasePath = resolve(projectRoot, path);
  const parent = dirname(databasePath);
  try {
    if (!statSync(parent).isDirectory()) fail("Not a directory.");
    accessSync(parent, constants.W_OK | constants.X_OK);
  } catch (error) {
    fail(`Database parent must exist and be writable: ${parent}. Create it or choose another path (${error.code ?? error.message}).`);
  }
  if (lstatSync(databasePath, { throwIfNoEntry: false })) {
    try {
      if (!statSync(databasePath).isFile()) fail("Not a regular file.");
      accessSync(databasePath, constants.R_OK | constants.W_OK);
    } catch (error) {
      fail(`Database target must be a readable, writable file: ${databasePath} (${error.code ?? error.message}).`);
    }
  }
  return `sqlite:${databasePath}`;
}

/**
 * Check that the source directory contains readable numbered SQL files.
 * @param {string} value Literal directory path, relative to the repository or absolute.
 * @param {string} source Setting's origin, used in error messages.
 * @returns {string} Absolute migration directory path.
 */
function validateMigrationSource(value, source) {
  if (value.startsWith("~")) fail(`Expand ~ in MIGRATION_SRC_PATH in ${source} to a literal path.`);
  const path = resolve(projectRoot, value);
  try {
    if (!statSync(path).isDirectory()) fail("Not a directory.");
    accessSync(path, constants.R_OK | constants.X_OK);
    const files = readdirSync(path).filter((name) => /^\d+.*\.sql$/.test(name));
    if (!files.length) fail("No numbered .sql migration files found.");
    for (const name of files) {
      const file = resolve(path, name);
      if (!statSync(file).isFile()) fail(`${name} is not a regular file.`);
      accessSync(file, constants.R_OK);
    }
  } catch (error) {
    fail(`MIGRATION_SRC_PATH must be a readable directory containing numbered SQL migrations: ${path} (${error.code ?? error.message}).`);
  }
  return path;
}

/**
 * Read a required setting, preferring the exported environment value.
 * @param {Record<string, string>} configuration Parsed dotenv values.
 * @param {string} key Required setting name.
 * @param {string} envFile Configuration path for error messages.
 * @returns {{value: string, source: string}} Validated literal value and its origin.
 */
function readSetting(configuration, key, envFile) {
  const overridden = Object.hasOwn(process.env, key);
  const value = overridden ? process.env[key] : configuration[key];
  const source = overridden ? "the shell environment" : envFile;
  if (!value?.trim()) fail(`${key} is empty or missing. Set it in ${source}.`);
  if (value !== value.trim() || /[\x00-\x1f\x7f$]/.test(value)) {
    fail(`${key} in ${source} must be literal, without surrounding whitespace, control characters, or variable expansion.`);
  }
  return { value, source };
}

/**
 * Validate both migration settings without creating files or opening SQLite.
 * @param {string} envFile Configuration file path.
 * @returns {{databaseURL: string, migrationSourcePath: string}} Checked dbmate inputs.
 */
function preflight(envFile) {
  const configuration = readConfiguration(envFile);
  const database = readSetting(configuration, databaseKey, envFile);
  const migrationSource = readSetting(configuration, "MIGRATION_SRC_PATH", envFile);
  return {
    databaseURL: validateDatabaseURL(database.value, database.source),
    migrationSourcePath: validateMigrationSource(migrationSource.value, migrationSource.source),
  };
}

/**
 * Read the action and optional configuration path.
 * @param {string[]} args Command-line arguments, excluding Node and the script path.
 * @returns {{action: string, envFile?: string}} Selected action and absolute env path.
 */
function parseArguments(args) {
  const [action = "help", ...options] = args;
  if (["help", "-h", "--help"].includes(action)) return { action: "help" };
  if (!["install", "check", "run", "report"].includes(action)) {
    fail(`Unknown action: ${action}`, 2);
  }
  let envFile = resolve(projectRoot, ".env.migrations");
  for (let index = 0; index < options.length; index++) {
    const option = options[index];
    if (["-h", "--help"].includes(option)) return { action: "help" };
    if (option !== "--env-file") fail(`Unknown argument: ${option}`, 2);
    const value = options[++index];
    if (!value || value.startsWith("--")) fail("--env-file requires a path.", 2);
    envFile = resolve(value);
  }
  return { action, envFile };
}

/**
 * Invoke pinned dbmate through npm, forwarding terminal output and exit status.
 * @param {string[]} args Dbmate arguments; passed directly without a shell.
 * @returns {number} Child exit code, or 128 plus its termination signal number.
 */
function runDbmate(args) {
  const result = spawnSync("npm", [
    "exec", "--yes", `--package=${dbmatePackage}`, "--", "dbmate", ...args,
  ], { cwd: projectRoot, stdio: "inherit", shell: false });
  if (result.error) {
    if (result.error.code === "ENOENT") fail("npm was not found. Install Node.js and npm first.");
    fail(`Cannot start npm: ${result.error.message}`);
  }
  if (result.signal) {
    console.error(`dbmate interrupted by ${result.signal}.`);
    return 128 + (osConstants.signals[result.signal] ?? 0);
  }
  return result.status ?? 1;
}

/**
 * Dispatch process.argv to help, installation, preflight, or migration execution.
 * @returns {number} Process exit status: 0 on success, nonzero on failure.
 */
function main() {
  const { action, envFile } = parseArguments(process.argv.slice(2));
  if (action === "help") {
    console.log(usage);
    return 0;
  }
  if (action === "install") {
    console.log(`Preparing ${dbmatePackage} in the npm cache.`);
    return runDbmate(["--env-file", "/dev/null", "--version"]);
  }

  let configuration;
  try {
    configuration = preflight(envFile);
  } catch (error) {
    console.error(`Preflight failed: ${error.message}`);
    return 1;
  }
  console.log("Preflight passed.");
  if (action === "check") {
    console.log(`Database URL: ${configuration.databaseURL}`);
    console.log(`SQL source: ${configuration.migrationSourcePath}`);
    return 0;
  }

  console.log(`Migration action: ${action}; configuration: ${envFile}`);
  const exitCode = runDbmate([
    "--url", configuration.databaseURL,
    "--env-file", envFile,
    "--env", databaseKey,
    "--migrations-dir", configuration.migrationSourcePath,
    "--no-dump-schema",
    ...(action === "run" ? ["up", "--strict"] : ["status"]),
  ]);
  if (exitCode === 0) {
    console.log(`Migration ${action} completed.`);
  } else {
    console.error(`Migration ${action} failed (exit ${exitCode}). Check the error above and the configuration in ${envFile}.`);
  }
  return exitCode;
}

try {
  process.exitCode = main();
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exitCode = error.exitCode ?? 1;
  if (error.exitCode === 2) console.error(usage);
}
