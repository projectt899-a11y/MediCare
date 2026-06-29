const { Pool } = require('pg');

/**
 * Direct SQL Executor for PostgreSQL
 * Uses native PostgreSQL connection instead of Supabase RPC
 */

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 6543,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function executeSql(sql) {
  try {
    const result = await pool.query(sql);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function executeMultipleSql(sqlStatements) {
  const results = [];
  for (const sql of sqlStatements) {
    if (sql.trim()) {
      const result = await executeSql(sql);
      results.push(result);
    }
  }
  return results;
}

async function checkTableExists(tableName) {
  try {
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [tableName]);
    return result.rows[0].exists;
  } catch (error) {
    console.error(`Error checking table ${tableName}:`, error.message);
    return false;
  }
}

async function getTableStructure(tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position;
    `, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting table structure for ${tableName}:`, error.message);
    return [];
  }
}

async function getTableIndexes(tableName) {
  try {
    const result = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = $1
      ORDER BY indexname;
    `, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting indexes for ${tableName}:`, error.message);
    return [];
  }
}

async function getTableConstraints(tableName) {
  try {
    const result = await pool.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = $1
      ORDER BY constraint_name;
    `, [tableName]);
    return result.rows;
  } catch (error) {
    console.error(`Error getting constraints for ${tableName}:`, error.message);
    return [];
  }
}

async function closePool() {
  await pool.end();
}

module.exports = {
  executeSql,
  executeMultipleSql,
  checkTableExists,
  getTableStructure,
  getTableIndexes,
  getTableConstraints,
  closePool
};
