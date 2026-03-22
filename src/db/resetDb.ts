import { db } from './database';

/**
 * Reset IndexedDB database
 * Use this in development when schema changes
 */
export async function resetDatabase(): Promise<void> {
  try {
    // Close the database connection
    db.close();

    // Delete the database
    await db.delete();

    console.log('✅ Database deleted successfully');
    console.log('🔄 Please refresh the page to recreate the database');
  } catch (error) {
    console.error('❌ Failed to delete database:', error);
    throw error;
  }
}

/**
 * Check if database needs reset (for development)
 */
export function checkDatabaseVersion(): void {
  if (import.meta.env.DEV) {
    console.log('🔍 Development mode: Database version checking enabled');
    console.log('💡 If you encounter schema errors, run: resetDatabase() in console');
  }
}
