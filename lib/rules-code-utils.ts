/**
 * Utilities for extracting and applying rules code
 */

import fs from 'fs';
import path from 'path';

// ============================================================================
// EXTRACT CURRENT RULES CODE
// ============================================================================

/**
 * Extract the generateRulesBasedHints() function from attribute-tagger.ts
 */
export function extractCurrentRulesCode(): string {
  const filePath = path.join(process.cwd(), 'lib', 'attribute-tagger.ts');

  if (!fs.existsSync(filePath)) {
    throw new Error(`attribute-tagger.ts not found at ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf-8');

  // Find the start of generateRulesBasedHints function
  const functionStart = content.indexOf('function generateRulesBasedHints(');
  if (functionStart === -1) {
    throw new Error('generateRulesBasedHints function not found');
  }

  // Find the end of the function (look for the closing brace at the same indentation level)
  // This is a simple implementation - counts braces after function start
  let braceCount = 0;
  let inFunction = false;
  let functionEnd = functionStart;

  for (let i = functionStart; i < content.length; i++) {
    const char = content[i];

    if (char === '{') {
      braceCount++;
      inFunction = true;
    } else if (char === '}') {
      braceCount--;
      if (inFunction && braceCount === 0) {
        functionEnd = i + 1;
        break;
      }
    }
  }

  if (functionEnd === functionStart) {
    throw new Error('Could not find end of generateRulesBasedHints function');
  }

  const functionCode = content.substring(functionStart, functionEnd);

  console.log(`📝 Extracted generateRulesBasedHints function (${functionCode.length} chars)`);

  return functionCode;
}

/**
 * Extract the full attribute-tagger.ts file content
 */
export function extractFullFile(): string {
  const filePath = path.join(process.cwd(), 'lib', 'attribute-tagger.ts');

  if (!fs.existsSync(filePath)) {
    throw new Error(`attribute-tagger.ts not found at ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
}

// ============================================================================
// APPLY IMPROVED RULES CODE
// ============================================================================

/**
 * Apply improved rules code to attribute-tagger.ts
 * Creates a backup first
 */
export function applyImprovedRulesCode(improvedCode: string): {
  success: boolean;
  backupPath: string;
  error?: string;
} {
  const filePath = path.join(process.cwd(), 'lib', 'attribute-tagger.ts');

  if (!fs.existsSync(filePath)) {
    return {
      success: false,
      backupPath: '',
      error: `attribute-tagger.ts not found at ${filePath}`
    };
  }

  try {
    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(
      process.cwd(),
      'lib',
      `attribute-tagger.ts.backup.${timestamp}`
    );

    const originalContent = fs.readFileSync(filePath, 'utf-8');
    fs.writeFileSync(backupPath, originalContent, 'utf-8');

    console.log(`📦 Created backup: ${backupPath}`);

    // Find and replace the generateRulesBasedHints function
    const functionStart = originalContent.indexOf('function generateRulesBasedHints(');
    if (functionStart === -1) {
      return {
        success: false,
        backupPath,
        error: 'generateRulesBasedHints function not found in original file'
      };
    }

    // Find the end of the function
    let braceCount = 0;
    let inFunction = false;
    let functionEnd = functionStart;

    for (let i = functionStart; i < originalContent.length; i++) {
      const char = originalContent[i];

      if (char === '{') {
        braceCount++;
        inFunction = true;
      } else if (char === '}') {
        braceCount--;
        if (inFunction && braceCount === 0) {
          functionEnd = i + 1;
          break;
        }
      }
    }

    if (functionEnd === functionStart) {
      return {
        success: false,
        backupPath,
        error: 'Could not find end of generateRulesBasedHints function'
      };
    }

    // Replace the function
    const beforeFunction = originalContent.substring(0, functionStart);
    const afterFunction = originalContent.substring(functionEnd);

    const newContent = beforeFunction + improvedCode + afterFunction;

    // Write the new file
    fs.writeFileSync(filePath, newContent, 'utf-8');

    console.log(`✅ Applied improved rules to attribute-tagger.ts`);
    console.log(`   Backup saved to: ${path.basename(backupPath)}`);

    return {
      success: true,
      backupPath
    };

  } catch (error) {
    return {
      success: false,
      backupPath: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Restore from backup
 */
export function restoreFromBackup(backupPath: string): {
  success: boolean;
  error?: string;
} {
  const filePath = path.join(process.cwd(), 'lib', 'attribute-tagger.ts');

  if (!fs.existsSync(backupPath)) {
    return {
      success: false,
      error: `Backup file not found: ${backupPath}`
    };
  }

  try {
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    fs.writeFileSync(filePath, backupContent, 'utf-8');

    console.log(`♻️  Restored from backup: ${path.basename(backupPath)}`);

    return { success: true };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * List available backups
 */
export function listBackups(): string[] {
  const libDir = path.join(process.cwd(), 'lib');

  if (!fs.existsSync(libDir)) {
    return [];
  }

  const files = fs.readdirSync(libDir);
  return files
    .filter(f => f.startsWith('attribute-tagger.ts.backup.'))
    .sort()
    .reverse(); // Most recent first
}
