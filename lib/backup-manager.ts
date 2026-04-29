/**
 * Backup Manager
 * Creates timestamped backups for bulk operations
 *
 * CRITICAL: User has corrected multiple times - ALWAYS create backups before bulk operations
 */

import * as fs from 'fs';
import * as path from 'path';
import type { StoredOutfit } from './outfit-storage';
import type { UnifiedRecipe } from './unified-recipe-types';

const SCRIPTS_DIR = path.resolve(__dirname, '../../scripts');
const BACKUPS_DIR = path.join(SCRIPTS_DIR, 'backups');

// Master file paths
const OUTFITS_MASTER = path.join(SCRIPTS_DIR, 'outfits-MASTER.json');
const RECIPES_MASTER = path.join(SCRIPTS_DIR, 'recipes-MASTER.json');

// Backup retention
const MAX_BACKUPS_PER_TYPE = 10;

export type BackupType = 'recipes' | 'outfits';

export interface BackupMetadata {
  timestamp: string;
  type: BackupType;
  fileName: string;
  recordCount: number;
  reason: string;
  version: string;
}

/**
 * Initialize backups directory
 */
export function initBackupsDir(): void {
  if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    console.log('✓ Created backups directory');
  }
}

/**
 * Create a timestamped backup of a master file
 * @param type - 'recipes' or 'outfits'
 * @param reason - Why the backup is being created (e.g., 'bulk-cooking', 'mass-tagging')
 * @returns Path to backup file
 */
export async function createBackup(
  type: BackupType,
  reason: string = 'manual-backup'
): Promise<string> {
  initBackupsDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '-').slice(0, -5);
  const masterFile = type === 'recipes' ? RECIPES_MASTER : OUTFITS_MASTER;
  const backupFile = path.join(BACKUPS_DIR, `${type}-backup-${timestamp}.json`);

  // Check if master file exists
  if (!fs.existsSync(masterFile)) {
    console.warn(`⚠️  Master file not found: ${masterFile}`);
    console.warn(`   Creating empty master file first...`);

    const emptyData = {
      [type]: [],
      metadata: {
        [`total${type.charAt(0).toUpperCase() + type.slice(1)}`]: 0,
        lastUpdated: new Date().toISOString(),
        version: '1.0',
      },
    };

    fs.writeFileSync(masterFile, JSON.stringify(emptyData, null, 2));
  }

  // Copy master file to backup
  fs.copyFileSync(masterFile, backupFile);

  // Read record count for metadata
  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  const recordCount = backupData[type]?.length || 0;

  // Save backup metadata
  const metadata: BackupMetadata = {
    timestamp: new Date().toISOString(),
    type,
    fileName: path.basename(backupFile),
    recordCount,
    reason,
    version: '1.0',
  };

  const metadataFile = backupFile.replace('.json', '.meta.json');
  fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2));

  console.log(`✓ Backup created: ${path.basename(backupFile)}`);
  console.log(`  Records: ${recordCount}`);
  console.log(`  Reason: ${reason}`);

  // Clean up old backups
  await cleanOldBackups(type);

  return backupFile;
}

/**
 * Clean up old backups (keep only MAX_BACKUPS_PER_TYPE most recent)
 */
export async function cleanOldBackups(type: BackupType): Promise<number> {
  initBackupsDir();

  const prefix = `${type}-backup-`;
  const backupFiles = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.json') && !f.endsWith('.meta.json'))
    .map((f) => ({
      name: f,
      path: path.join(BACKUPS_DIR, f),
      mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.mtime - a.mtime); // Newest first

  const toDelete = backupFiles.slice(MAX_BACKUPS_PER_TYPE);

  let deletedCount = 0;
  for (const file of toDelete) {
    fs.unlinkSync(file.path);

    // Also delete metadata file if exists
    const metaPath = file.path.replace('.json', '.meta.json');
    if (fs.existsSync(metaPath)) {
      fs.unlinkSync(metaPath);
    }

    deletedCount++;
  }

  if (deletedCount > 0) {
    console.log(`🗑️  Cleaned up ${deletedCount} old ${type} backups (keeping ${MAX_BACKUPS_PER_TYPE} most recent)`);
  }

  return deletedCount;
}

/**
 * List available backups for a type
 */
export function listBackups(type: BackupType): BackupMetadata[] {
  initBackupsDir();

  const prefix = `${type}-backup-`;
  const backupFiles = fs
    .readdirSync(BACKUPS_DIR)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.meta.json'))
    .map((f) => {
      const metaPath = path.join(BACKUPS_DIR, f);
      try {
        return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as BackupMetadata;
      } catch (error) {
        console.warn(`Failed to read metadata: ${f}`);
        return null;
      }
    })
    .filter((m): m is BackupMetadata => m !== null)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return backupFiles;
}

/**
 * Restore from a backup file
 * @param backupFile - Full path to backup file or just the filename
 * @param type - 'recipes' or 'outfits'
 */
export async function restoreFromBackup(
  backupFile: string,
  type: BackupType
): Promise<void> {
  // If just filename provided, resolve to full path
  const backupPath = path.isAbsolute(backupFile)
    ? backupFile
    : path.join(BACKUPS_DIR, backupFile);

  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found: ${backupPath}`);
  }

  // Create a backup of current master before restoring
  console.log('🔄 Creating backup of current master file before restore...');
  await createBackup(type, 'pre-restore-safety-backup');

  const masterFile = type === 'recipes' ? RECIPES_MASTER : OUTFITS_MASTER;

  // Copy backup to master file
  fs.copyFileSync(backupPath, masterFile);

  // Read record count
  const data = JSON.parse(fs.readFileSync(masterFile, 'utf-8'));
  const recordCount = data[type]?.length || 0;

  console.log(`✓ Restored from backup: ${path.basename(backupPath)}`);
  console.log(`  Records restored: ${recordCount}`);
}

/**
 * Save outfits to master file
 * @param outfits - Array of outfits to save
 * @param createBackupFirst - Whether to create backup before saving (default: true)
 */
export async function saveOutfitsToMaster(
  outfits: StoredOutfit[],
  createBackupFirst: boolean = true,
  reason: string = 'manual-save'
): Promise<void> {
  if (createBackupFirst && fs.existsSync(OUTFITS_MASTER)) {
    await createBackup('outfits', reason);
  }

  const masterData = {
    outfits,
    metadata: {
      totalOutfits: outfits.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    },
  };

  fs.writeFileSync(OUTFITS_MASTER, JSON.stringify(masterData, null, 2));
  console.log(`✓ Saved ${outfits.length} outfits to master file`);
}

/**
 * Save recipes to master file
 * @param recipes - Array of recipes to save
 * @param createBackupFirst - Whether to create backup before saving (default: true)
 */
export async function saveRecipesToMaster(
  recipes: UnifiedRecipe[],
  createBackupFirst: boolean = true,
  reason: string = 'manual-save'
): Promise<void> {
  if (createBackupFirst && fs.existsSync(RECIPES_MASTER)) {
    await createBackup('recipes', reason);
  }

  const masterData = {
    recipes,
    metadata: {
      totalRecipes: recipes.length,
      lastUpdated: new Date().toISOString(),
      version: '1.0',
    },
  };

  fs.writeFileSync(RECIPES_MASTER, JSON.stringify(masterData, null, 2));
  console.log(`✓ Saved ${recipes.length} recipes to master file`);
}

/**
 * Load outfits from master file
 */
export function loadOutfitsFromMaster(): StoredOutfit[] {
  if (!fs.existsSync(OUTFITS_MASTER)) {
    console.warn('⚠️  Outfits master file not found');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(OUTFITS_MASTER, 'utf-8'));
  return data.outfits || [];
}

/**
 * Load recipes from master file
 */
export function loadRecipesFromMaster(): UnifiedRecipe[] {
  if (!fs.existsSync(RECIPES_MASTER)) {
    console.warn('⚠️  Recipes master file not found');
    return [];
  }

  const data = JSON.parse(fs.readFileSync(RECIPES_MASTER, 'utf-8'));
  return data.recipes || [];
}

/**
 * Get storage statistics
 */
export function getStorageStats(): {
  outfits: { count: number; lastUpdated: string | null };
  recipes: { count: number; lastUpdated: string | null };
  backups: { outfits: number; recipes: number };
} {
  const outfits = loadOutfitsFromMaster();
  const recipes = loadRecipesFromMaster();

  const outfitsMetadata = fs.existsSync(OUTFITS_MASTER)
    ? JSON.parse(fs.readFileSync(OUTFITS_MASTER, 'utf-8')).metadata
    : null;

  const recipesMetadata = fs.existsSync(RECIPES_MASTER)
    ? JSON.parse(fs.readFileSync(RECIPES_MASTER, 'utf-8')).metadata
    : null;

  const outfitBackups = listBackups('outfits').length;
  const recipeBackups = listBackups('recipes').length;

  return {
    outfits: {
      count: outfits.length,
      lastUpdated: outfitsMetadata?.lastUpdated || null,
    },
    recipes: {
      count: recipes.length,
      lastUpdated: recipesMetadata?.lastUpdated || null,
    },
    backups: {
      outfits: outfitBackups,
      recipes: recipeBackups,
    },
  };
}
