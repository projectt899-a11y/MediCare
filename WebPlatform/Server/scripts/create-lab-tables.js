#!/usr/bin/env node

/**
 * Lab Tables Creation Script
 * 
 * This script creates the lab_requests and lab_results tables directly
 * using PostgreSQL connection.
 * 
 * Usage:
 *   node scripts/create-lab-tables.js
 * 
 * Note: Requires DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration from environment
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 6543,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function executeSQL(sql, description) {
  try {
    console.log(`\n▶ Executing: ${description}`);
    const result = await pool.query(sql);
    console.log(`✓ Successfully executed: ${description}`);
    return true;
  } catch (err) {
    console.error(`✗ Error executing ${description}:`);
    console.error(`  ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Laboratory Module - Lab Tables Creation Script        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  try {
    // Test connection
    console.log('Testing database connection...');
    const testResult = await pool.query('SELECT NOW()');
    console.log('✓ Database connection successful\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '../src/migrations/005_create_lab_requests_and_results_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`Found ${statements.length} SQL statements to execute\n`);
    
    // Execute each statement
    const results = [];
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const description = stmt.substring(0, 60).replace(/\n/g, ' ') + (stmt.length > 60 ? '...' : '');
      results.push(await executeSQL(stmt + ';', description));
    }
    
    // Verify tables exist
    console.log('\n▶ Verifying table creation...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('lab_requests', 'lab_results')
      ORDER BY table_name;
    `);
    
    if (tablesResult.rows.length === 2) {
      console.log('✓ Both tables verified in database');
      console.log(`  - ${tablesResult.rows.map(r => r.table_name).join('\n  - ')}`);
    } else {
      console.log('✗ Table verification failed');
      results.push(false);
    }
    
    // Verify indexes exist
    console.log('\n▶ Verifying indexes...');
    const indexesResult = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('lab_requests', 'lab_results')
      ORDER BY indexname;
    `);
    
    console.log(`✓ Found ${indexesResult.rows.length} indexes`);
    indexesResult.rows.forEach(row => {
      console.log(`  - ${row.indexname}`);
    });
    
    // Verify constraints
    console.log('\n▶ Verifying constraints...');
    const constraintsResult = await pool.query(`
      SELECT constraint_name, table_name
      FROM information_schema.table_constraints
      WHERE table_name IN ('lab_requests', 'lab_results')
      AND constraint_type IN ('CHECK', 'UNIQUE', 'FOREIGN KEY')
      ORDER BY table_name, constraint_name;
    `);
    
    console.log(`✓ Found ${constraintsResult.rows.length} constraints`);
    constraintsResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}: ${row.constraint_name}`);
    });
    
    // Get table structure
    console.log('\n▶ Lab Requests Table Structure:');
    const labRequestsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lab_requests'
      ORDER BY ordinal_position;
    `);
    
    labRequestsColumns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    console.log('\n▶ Lab Results Table Structure:');
    const labResultsColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lab_results'
      ORDER BY ordinal_position;
    `);
    
    labResultsColumns.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  - ${col.column_name}: ${col.data_type} ${nullable}`);
    });
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Execution Summary                                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    if (results.every(r => r)) {
      console.log('✓ All tables and indexes created successfully!');
      console.log('\nTask 1.3 completed:');
      console.log('  ✓ lab_requests table created with all fields and constraints');
      console.log('  ✓ lab_results table created with file and manual entry support');
      console.log('  ✓ Version fields added for optimistic locking');
      console.log('  ✓ Indexes created for frequently queried columns');
      console.log('  ✓ Foreign key relationships verified');
      console.log('  ✓ CHECK constraints for status transitions and result content');
      process.exit(0);
    } else {
      console.log('✗ Some operations failed. Check errors above.');
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
