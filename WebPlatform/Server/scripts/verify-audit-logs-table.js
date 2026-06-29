#!/usr/bin/env node

/**
 * Verification Script for lab_audit_logs Table
 * 
 * This script verifies that the lab_audit_logs table was created correctly
 * with all required columns, constraints, and indexes.
 * 
 * Usage:
 *   node scripts/verify-audit-logs-table.js
 * 
 * Note: Requires DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables
 */

require('dotenv').config();
const { Client } = require('pg');

const dbHost = process.env.DB_HOST;
const dbUser = process.env.DB_USER;
const dbPassword = process.env.DB_PASSWORD;
const dbName = process.env.DB_NAME;
const dbPort = process.env.DB_PORT || 5432;

if (!dbHost || !dbUser || !dbPassword || !dbName) {
  console.error('Error: Database configuration environment variables are required');
  console.error('Required: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
  process.exit(1);
}

const client = new Client({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
  ssl: { rejectUnauthorized: false }
});

async function verifyTable() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // 1. Check if table exists
    console.log('1️⃣  Checking if lab_audit_logs table exists...');
    const tableResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'lab_audit_logs'
    `);
    
    if (tableResult.rows.length === 0) {
      console.error('❌ Table lab_audit_logs does not exist\n');
      await client.end();
      process.exit(1);
    }
    console.log('✅ Table lab_audit_logs exists\n');

    // 2. Check table structure
    console.log('2️⃣  Checking table structure...');
    const columnsResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lab_audit_logs'
      ORDER BY ordinal_position
    `);
    
    console.log(`   Found ${columnsResult.rows.length} columns:`);
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.column_default ? ` DEFAULT ${col.column_default}` : '';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${defaultVal}`);
    });
    console.log();

    // 3. Check constraints
    console.log('3️⃣  Checking constraints...');
    const constraintsResult = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'lab_audit_logs'
    `);
    
    console.log(`   Found ${constraintsResult.rows.length} constraints:`);
    constraintsResult.rows.forEach(constraint => {
      console.log(`   - ${constraint.constraint_name}: ${constraint.constraint_type}`);
    });
    console.log();

    // 4. Check indexes
    console.log('4️⃣  Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'lab_audit_logs'
    `);
    
    console.log(`   Found ${indexesResult.rows.length} indexes:`);
    indexesResult.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    console.log();

    // 5. Check RLS
    console.log('5️⃣  Checking Row Level Security...');
    const rlsResult = await client.query(`
      SELECT relname, relrowsecurity
      FROM pg_class
      WHERE relname = 'lab_audit_logs'
    `);
    
    if (rlsResult.rows.length > 0) {
      const rls = rlsResult.rows[0];
      console.log(`   RLS Enabled: ${rls.relrowsecurity ? 'YES' : 'NO'}`);
    }
    console.log();

    // 6. Check RLS policies
    console.log('6️⃣  Checking RLS policies...');
    const policiesResult = await client.query(`
      SELECT policyname, permissive, roles, qual
      FROM pg_policies
      WHERE tablename = 'lab_audit_logs'
    `);
    
    console.log(`   Found ${policiesResult.rows.length} policies:`);
    policiesResult.rows.forEach(policy => {
      console.log(`   - ${policy.policyname} (${policy.permissive})`);
    });
    console.log();

    // 7. Check foreign keys
    console.log('7️⃣  Checking foreign key relationships...');
    const fkResult = await client.query(`
      SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
      FROM information_schema.key_column_usage
      WHERE table_name = 'lab_audit_logs' AND foreign_table_name IS NOT NULL
    `);
    
    console.log(`   Found ${fkResult.rows.length} foreign keys:`);
    fkResult.rows.forEach(fk => {
      console.log(`   - ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
    });
    console.log();

    // 8. Summary
    console.log('✨ Verification Summary:');
    console.log(`   ✅ Table exists: YES`);
    console.log(`   ✅ Columns: ${columnsResult.rows.length} (expected 9)`);
    console.log(`   ✅ Constraints: ${constraintsResult.rows.length} (expected 5)`);
    console.log(`   ✅ Indexes: ${indexesResult.rows.length} (expected 4)`);
    console.log(`   ✅ RLS Enabled: ${rlsResult.rows.length > 0 && rlsResult.rows[0].relrowsecurity ? 'YES' : 'NO'}`);
    console.log(`   ✅ RLS Policies: ${policiesResult.rows.length} (expected 1)`);
    console.log(`   ✅ Foreign Keys: ${fkResult.rows.length} (expected 1)`);
    console.log();

    // Check if all requirements are met
    const allRequirementsMet = 
      columnsResult.rows.length === 9 &&
      constraintsResult.rows.length === 5 &&
      indexesResult.rows.length === 4 &&
      (rlsResult.rows.length > 0 && rlsResult.rows[0].relrowsecurity) &&
      policiesResult.rows.length === 1 &&
      fkResult.rows.length === 1;

    if (allRequirementsMet) {
      console.log('✅ All requirements met! Table is correctly configured.');
    } else {
      console.log('⚠️  Some requirements may not be met. Please review the output above.');
    }

    await client.end();
  } catch (error) {
    console.error('❌ Verification error:', error.message);
    await client.end();
    process.exit(1);
  }
}

verifyTable();
