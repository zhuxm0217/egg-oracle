'use strict';

const assert = require('assert');
const oracledb = require('oracledb');
const aesjs = require('aes-js');
let count = 0;

module.exports = app => {
  app.addSingleton('oracle', createOneClient);
};
/**
 * Creates a database managed connection pool.
 * @param {Object} config app.config.oracle
 * @param {egg.EggApplication} app EggApplication
 * @return {oracledb.IConnectionPool} pool
 */
async function createOneClient(config, app) {
  const key_128 = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15 ];
  // decrypt
  const encryptedBytes = aesjs.utils.hex.toBytes(config.db);
  const aesCtr = new aesjs.ModeOfOperation.ctr(key_128, new aesjs.Counter(5));
  const decryptedBytes = aesCtr.decrypt(encryptedBytes);
  const decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
  let dbConfig = {};
  try {
    dbConfig = JSON.parse(decryptedText);
  } catch (err) {
    throw err;
  }
  
  assert(dbConfig.user && dbConfig.password && dbConfig.connectString,
    `[egg-oracle] '${dbConfig.connectString}', 'user: ${dbConfig.user}' are required on config`);
  app.coreLogger.info('[egg-oracle] connecting %s', dbConfig.connectString);
  const pool = await oracledb.createPool(dbConfig);
  const conn = await pool.getConnection();
  const { rows } = await conn.execute("select to_char(sysdate,'yyyy-MM-dd HH24:mi:ss') from dual", []);
  await conn.close();
  const index = count++;
  app.coreLogger.info(`[egg-oracle] instance[${index}] status OK, currentTime: ${rows[0][0]}`);

  return pool;
}
