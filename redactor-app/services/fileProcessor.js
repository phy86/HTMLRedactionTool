const fs = require('fs').promises;
const path = require('path');
const { previewSensitiveContent, redactSensitiveContent } = require('./redaction');

/**
 * Recursively finds all HTML files in a directory
 * @param {string} dir - Directory to scan
 * @returns {Promise<string[]>} Array of HTML file paths
 */
async function findHtmlFiles(dir) {
    const files = [];
    
    async function scan(directory) {
        console.log('Scanning directory:', directory);
        try {
            const entries = await fs.readdir(directory, { withFileTypes: true });
            console.log(`Found ${entries.length} entries in ${directory}`);
            
            for (const entry of entries) {
                const fullPath = path.join(directory, entry.name);
                
                if (entry.isDirectory()) {
                    await scan(fullPath);
                } else if (entry.isFile() && path.extname(entry.name).toLowerCase() === '.html') {
                    console.log('Found HTML file:', fullPath);
                    files.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${directory}:`, error);
            throw error;
        }
    }

    await scan(dir);
    console.log('Total HTML files found:', files.length);
    return files;
}

/**
 * Creates directory structure for output files
 * @param {string} inputPath - Original file path
 * @param {string} inputRoot - Root input directory
 * @param {string} outputRoot - Root output directory
 */
async function ensureOutputDir(inputPath, inputRoot, outputRoot) {
    const relativePath = path.relative(inputRoot, path.dirname(inputPath));
    const outputDir = path.join(outputRoot, relativePath);
    
    try {
        await fs.mkdir(outputDir, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
    
    return path.join(outputDir, path.basename(inputPath));
}

/**
 * Process HTML files for preview
 * @param {string} inputFolder - Input directory path
 * @param {string|string[]|null} patterns - Optional regex patterns
 * @returns {Promise<Object>} Object mapping file paths to their preview content
 */
async function processHTMLFilesForPreview(inputFolder, patterns = null) {
    const results = {};
    const errors = {};

    try {
        const htmlFiles = await findHtmlFiles(inputFolder);

        for (const filePath of htmlFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const previewContent = previewSensitiveContent(content, patterns);
                const relativePath = path.relative(inputFolder, filePath);
                results[relativePath] = previewContent;
            } catch (error) {
                errors[filePath] = `Error processing file: ${error.message}`;
            }
        }

        return {
            success: true,
            results,
            errors: Object.keys(errors).length > 0 ? errors : null,
            fileCount: Object.keys(results).length
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to process directory: ${error.message}`,
            results: null,
            fileCount: 0
        };
    }
}

/**
 * Process HTML files for redaction
 * @param {string} inputFolder - Input directory path
 * @param {string} outputFolder - Output directory path
 * @param {string|string[]|null} patterns - Optional regex patterns
 * @returns {Promise<Object>} Processing results and statistics
 */
async function processHTMLFilesForRedaction(inputFolder, outputFolder, patterns = null) {
    const processed = [];
    const errors = {};

    try {
        const htmlFiles = await findHtmlFiles(inputFolder);

        for (const filePath of htmlFiles) {
            try {
                const content = await fs.readFile(filePath, 'utf8');
                const redactedContent = redactSensitiveContent(content, patterns);
                
                const outputPath = await ensureOutputDir(filePath, inputFolder, outputFolder);
                await fs.writeFile(outputPath, redactedContent, 'utf8');
                
                processed.push(path.relative(inputFolder, filePath));
            } catch (error) {
                errors[filePath] = `Error processing file: ${error.message}`;
            }
        }

        return {
            success: true,
            processed,
            errors: Object.keys(errors).length > 0 ? errors : null,
            fileCount: processed.length,
            outputFolder
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to process directory: ${error.message}`,
            processed: [],
            fileCount: 0
        };
    }
}

module.exports = {
    processHTMLFilesForPreview,
    processHTMLFilesForRedaction
};