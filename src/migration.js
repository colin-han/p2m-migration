/**
 * Created by colinhan on 07/11/2016.
 */

import co from 'co';
import Sequelize from 'sequelize';
import QueryInterface from 'sequelize/lib/query-interface';
//noinspection SpellCheckingInspection
import Umzug from 'umzug';
import yargs from 'yargs';
import config from 'config';
import colors from 'colors/safe';

function log(str) {
  console.log(colors.cyan(str));
}
function error(str) {
  console.error(colors.red(str));
}

function banner() {
  let pkg = require('../package.json');
  console.log(colors.yellow(colors.bold(`p2migration v${pkg.version}`)));
  console.log('');
}

function getDbOptions(options) {
  let cfg = config.database || {};
  return {
    host: options.host || cfg.host || 'mysql',
    username: options.username || cfg.username || 'root',
    password: options.password || cfg.password,
    database: options.database || cfg.database,
    dialect: 'mysql',
    define: {
      freezeTableName: true,
    }
  };
}

function initDatabase(options) {
  let opt2 = Object.assign({}, options);
  opt2.database = 'mysql';

  let sequelize = new Sequelize(opt2);

  log(`Creating database if it not exist...`);
  return sequelize.query(`CREATE DATABASE IF NOT EXISTS ${options.database} COLLATE = "utf8_general_ci"`)
      .then(() => log(`Database created.`));
}

function getUmzug(options, queryInterface, sequelize) {
  return new Umzug({
    storage: 'sequelize',
    storageOptions: {
      sequelize: sequelize,
    },
    logging: false,
    upName: 'up',
    downName: 'down',
    migrations: {
      params: [queryInterface, Sequelize],
      path: options.migrations,
      pattern: /^\d+[\w-]+\.js$/,
      wrap: function (fun) {
        return fun;
      }
    }
  });
}
function umzugUp(options, dbOpt) {
  let sequelize = new Sequelize(dbOpt);
  let queryInterface = new QueryInterface(sequelize);
  let umzug = getUmzug(options, queryInterface, sequelize);
  log(`Umzug migration upping...`);
  return umzug.up(options.target === '@' ? {} : {to: options.target})
      .then(() => log(`Umzug migration upped done.`));
}
function seeders(options, dbOpt) {
  let sequelize = new Sequelize(dbOpt);
  let queryInterface = new QueryInterface(sequelize);
  let seeders = fs.readdirSync(options.seeders)
      .filter(function (file) {
        return file !== 'index.js' && file.slice(-3) === '.js';
      })
      .sort();

  log(`Seeders running...`);
  return co(function* seeds() {
    for (let i = 0; i < seeders.length; i++) {
      let seeder = path.join(__dirname, seeders[i]);
      let seederFunc = require(seeder);
      log(colors.bold(colors.gray('->')) + seeders[i]);
      yield seederFunc(queryInterface, Sequelize);
    }
  });
}
export function up(options) {
  let dbOpt = getDbOptions(options);

  banner();

  log(`Upward database to version: ${options.target}, database name is ${dbOpt.database}`);
  //noinspection JSUnresolvedFunction
  co(function*() {
    yield initDatabase(dbOpt);

    yield umzugUp(options, dbOpt);

    yield seeders(options, dbOpt);
  }).catch(error);
}

export function down(options) {
  banner();
  let dbOpt = getDbOptions(options);
  let sequelize = new Sequelize(dbOpt);
  let queryInterface = new QueryInterface(sequelize);
  let umzug = getUmzug(options, queryInterface, sequelize);
  log(`Downward database to version: ${options.target}, database name is ${dbOpt.database}`);
  umzug.down({to: options.target});
}

export function version() {
  let pkg = require('../package.json');
  log(pkg.version);
}

if (!module.parent) {
  let argv = yargs
      .usage('Usage: $0 <command> [options]')
      .describe('host', 'MySql database server address.')
      .alias('host', 'h')
      .describe('username', 'MySql database username')
      .alias('username', 'u')
      .describe('password', 'MySql database password')
      .alias('password', 'p')
      .describe('database', 'database name')
      .alias('database', 'd')
      .describe('migrations', 'Migrations folder path')
      .alias('migrations', 'm')
      .describe('seeders', 'Seeders folder path')
      .alias('seeders', 's')
      .command(['up', '*'], 'upward database to newer state.', {
        target: {
          alias: 't',
          default: '@',
          describe: 'target version to upward to.'
        }
      }, up)
      .command('down', 'downward database to older state.', {
        target: {
          alias: 't',
          describe: 'target version to downward to.'
        }
      }, down)
      .command('version', 'show version number of p2migration.', {}, version)
      .help()
      .argv;
}