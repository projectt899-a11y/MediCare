#!/usr/bin/env node

/**
 * Direct SQL Execution Script
 * 
 * This script executes SQL migrations directly using PostgreSQL client
 * 
 * Usage:
 *   node scripts/execute-sql-direct.js
 * 
 * Note: Requires DB_HOST, DB_USER, DB_PASSWORD, DB_NAME environment variables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
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

async function executeMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    const migrationsDir = path.join(__dirname, '../src/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory does not exist.');
      await client.end();
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      await client.end();
      return;
    }

    console.log(`📦 Found ${migrationFiles.length} migration file(s)\n`);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ Running migration: ${file}`);
      
      try {
        await client.query(sql);
        console.log(`✅ Migration completed: ${file}\n`);
      } catch (err) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(`   Error: ${err.message}\n`);
        throw err;
      }
    }

    console.log('✨ All migrations completed successfully!');
    await client.end();
  } catch (error) {
    console.error('❌ Migration execution error:', error.message);
    await client.end();
    process.exit(1);
  }
}

executeMigrations();
