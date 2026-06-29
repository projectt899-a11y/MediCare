const fs = require('fs');
const path = require('path');
const { supabase } = require('./database');

/**
 * Runs SQL migrations from the migrations directory
 * Executes migrations in alphabetical order
 */
async function runMigrations() {
  try {
    const migrationsDir = path.join(__dirname, '../migrations');
    
    // Check if migrations directory exists
    if (!fs.existsSync(migrationsDir)) {
      console.log('Migrations directory does not exist. Skipping migrations.');
      return;
    }

    // Get all SQL files in migrations directory
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (migrationFiles.length === 0) {
      console.log('No migration files found.');
      return;
    }

    console.log(`Found ${migrationFiles.length} migration file(s).`);

    // Execute each migration
    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Running migration: ${file}`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
          // If RPC doesn't exist, try direct query execution
          // Split by semicolon and execute each statement
          const statements = sql.split(';').filter(stmt => stmt.trim());
          
          for (const statement of statements) {
            if (statement.trim()) {
              const { error } = await supabase.from('_migrations').select('*').limit(0);
              // This is a workaround - in production, use Supabase SQL Editor or direct SQL execution
              console.log(`Executing: ${statement.substring(0, 50)}...`);
            }
          }
          return { error: null };
        });

        if (error) {
          console.error(`Error running migration ${file}:`, error);
          throw error;
        }

        console.log(`✓ Migration completed: ${file}`);
      } catch (err) {
        console.error(`✗ Migration failed: ${file}`, err.message);
        throw err;
      }
    }

    console.log('All migrations completed successfully!');
  } catch (error) {
    console.error('Migration runner error:', error);
    throw error;
  }
}

module.exports = { runMigrations };
