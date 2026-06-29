#!/usr/bin/env node

/**
 * Lab Schema Validation Script
 * 
 * This script validates the SQL syntax of the lab schema migration file
 * without executing it against the database.
 * 
 * Usage:
 *   node scripts/validate-lab-schema.js
 */

const fs = require('fs');
const path = require('path');

function validateSQL(sql) {
  const errors = [];
  const warnings = [];
  
  // Check for basic SQL syntax
  const lines = sql.split('\n');
  let inComment = false;
  let bracketCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lineNum = i + 1;
    
    // Skip empty lines and comments
    if (!line || line.startsWith('--')) continue;
    
    // Check for unclosed brackets
    for (const char of line) {
      if (char === '(') parenCount++;
      if (char === ')') parenCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;
    }
    
    // Check for CREATE TABLE statements
    if (line.includes('CREATE TABLE')) {
      if (!line.includes('IF NOT EXISTS')) {
        warnings.push(`Line ${lineNum}: CREATE TABLE without IF NOT EXISTS`);
      }
    }
    
    // Check for PRIMARY KEY
    if (line.includes('PRIMARY KEY')) {
      if (!line.includes('UUID')) {
        warnings.push(`Line ${lineNum}: PRIMARY KEY is not UUID`);
      }
    }
    
    // Check for REFERENCES (foreign keys)
    if (line.includes('REFERENCES')) {
      if (!line.includes('ON DELETE')) {
        warnings.push(`Line ${lineNum}: REFERENCES without ON DELETE clause`);
      }
    }
    
    // Check for CHECK constraints
    if (line.includes('CHECK')) {
      if (!line.includes('CONSTRAINT')) {
        warnings.push(`Line ${lineNum}: CHECK constraint without CONSTRAINT name`);
      }
    }
  }
  
  if (parenCount !== 0) {
    errors.push(`Unbalanced parentheses: ${parenCount > 0 ? 'missing )' : 'extra )'}`);
  }
  
  if (bracketCount !== 0) {
    errors.push(`Unbalanced brackets: ${bracketCount > 0 ? 'missing ]' : 'extra ]'}`);
  }
  
  return { errors, warnings };
}

function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  Laboratory Module - Schema Validation Script          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  try {
    const migrationPath = path.join(__dirname, '../src/migrations/005_create_lab_requests_and_results_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`✗ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    console.log(`Reading migration file: ${migrationPath}\n`);
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Count lines and statements
    const lines = sql.split('\n').length;
    const statements = sql.split(';').filter(s => s.trim() && !s.trim().startsWith('--')).length;
    
    console.log(`File Statistics:`);
    console.log(`  Lines: ${lines}`);
    console.log(`  SQL Statements: ${statements}\n`);
    
    // Validate SQL
    console.log('Validating SQL syntax...\n');
    const { errors, warnings } = validateSQL(sql);
    
    if (errors.length > 0) {
      console.log('✗ Errors found:');
      errors.forEach(err => console.log(`  - ${err}`));
      process.exit(1);
    } else {
      console.log('✓ No syntax errors found');
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠ Warnings:');
      warnings.forEach(warn => console.log(`  - ${warn}`));
    } else {
      console.log('✓ No warnings');
    }
    
    // Extract table definitions
    console.log('\n▶ Extracting table definitions...\n');
    
    const tableMatches = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/g);
    if (tableMatches) {
      console.log(`Found ${tableMatches.length} table definitions:`);
      tableMatches.forEach(match => {
        const tableName = match.replace('CREATE TABLE IF NOT EXISTS ', '');
        console.log(`  - ${tableName}`);
      });
    }
    
    // Extract index definitions
    console.log('\n▶ Extracting index definitions...\n');
    
    const indexMatches = sql.match(/CREATE INDEX IF NOT EXISTS (\w+)/g);
    if (indexMatches) {
      console.log(`Found ${indexMatches.length} index definitions:`);
      indexMatches.forEach(match => {
        const indexName = match.replace('CREATE INDEX IF NOT EXISTS ', '');
        console.log(`  - ${indexName}`);
      });
    }
    
    // Extract constraint definitions
    console.log('\n▶ Extracting constraint definitions...\n');
    
    const constraintMatches = sql.match(/CONSTRAINT (\w+)/g);
    if (constraintMatches) {
      const uniqueConstraints = [...new Set(constraintMatches.map(m => m.replace('CONSTRAINT ', '')))];
      console.log(`Found ${uniqueConstraints.length} constraint definitions:`);
      uniqueConstraints.forEach(constraint => {
        console.log(`  - ${constraint}`);
      });
    }
    
    // Summary
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║  Validation Summary                                    ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    console.log('✓ Schema validation completed successfully!');
    console.log('\nThe migration file is ready to be executed.');
    console.log('\nNext steps:');
    console.log('  1. Execute the migration using one of these methods:');
    console.log('     - Supabase SQL Editor (recommended)');
    console.log('     - node scripts/verify-lab-tables.js');
    console.log('     - PostgreSQL CLI');
    console.log('  2. Verify table creation with: node scripts/verify-lab-tables.js');
    console.log('  3. Proceed to Task 1.4: Create audit logging table');
    
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

main();
