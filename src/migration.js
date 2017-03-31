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

import seeders from './seeders';

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

  return sequelize.query('CREATE DATABASE IF NOT EXISTS :dbname COLLATE = "utf8_general_ci"',
      {reqlacements: {dbname: options.database}});
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
  return umzug.up(options.target === '@' ? {} : {to: options.target});
}

export function up(options) {
  let dbOpt = getDbOptions(options);

  console.log(`Upward database to version: ${options.target}`);
  //noinspection JSUnresolvedFunction
  co(function*() {
    yield initDatabase(dbOpt);

    yield umzugUp(options, dbOpt);

    yield seeders(options, queryInterface, Sequelize);
  }).catch(console.error);
}

export function down(options) {
  let dbOpt = getDbOptions(options);
  let sequelize = new Sequelize(dbOpt);
  let queryInterface = new QueryInterface(sequelize);
  let umzug = getUmzug(options, queryInterface, sequelize);
  console.log(`Downward database to version: ${options.target}`);
  umzug.down({to: options.target});
}

export function version() {
  let pkg = require('../package.json');
  console.log(pkg.version);
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