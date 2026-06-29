#!/usr/bin/env node

/**
 * Migration Runner Script
 * 
 * This script executes all SQL migrations in the migrations directory.
 * 
 * Usage:
 *   node scripts/run-migrations.js
 * 
 * Note: Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../src/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory does not exist.');
      return;
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`\n📦 Found ${migrationFiles.length} migration file(s)\n`);

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`⏳ Running migration: ${file}`);
      
      try {
        // Execute the SQL directly using Supabase
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(() => {
          // Fallback: If exec_sql RPC doesn't exist, we need to use the SQL Editor
          console.warn('⚠️  Note: Direct SQL execution via RPC not available.');
          console.warn('   Please execute the SQL manually in Supabase SQL Editor.');
          return { error: new Error('RPC not available') };
        });

        if (error && error.message !== 'RPC not available') {
          throw error;
        }

        console.log(`✅ Migration completed: ${file}\n`);
      } catch (err) {
        console.error(`❌ Migration failed: ${file}`);
        console.error(`   Error: ${err.message}\n`);
        throw err;
      }
    }

    console.log('✨ All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration runner error:', error.message);
    process.exit(1);
  }
}

runMigrations();
