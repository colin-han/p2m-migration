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

function initUmzug(options) {
  let cfg = config.database || {};
  const sequelize = new Sequelize({
    host: options.host || cfg.host || 'mysql',
    username: options.username || cfg.username || 'root',
    password: options.password || cfg.password,
    database: options.database || cfg.database,
    dialect: 'mysql',
    define: {
      freezeTableName: true,
    }
  });
  const queryInterface = new QueryInterface(sequelize);

//noinspection SpellCheckingInspection
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

export function up(options) {
  const umzug = initUmzug(options);
  console.log(`Upward database to version: ${options.target}`);
  //noinspection JSUnresolvedFunction
  co(function*() {
    yield umzug.up(options.target === '@' ? {} : {to: options.target});
    yield seeders(options);
  }).catch(console.error);
}

export function down(options) {
  const umzug = initUmzug(options);
  console.log(`Downward database to version: ${options.target}`);
  umzug.down({to: options.target});
}

export function version(options) {
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
      .command('version', 'show version number of p2migration.', {

      }, version)
      .help()
      .argv;
}