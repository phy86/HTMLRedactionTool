/**
 * Default patterns for identifying sensitive content if none are provided
 */
const DEFAULT_PATTERNS = [
    // Email addresses
    /([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g,
    // Phone numbers (various formats)
    /(\+\d{1,3}[\s-])?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    // Social Security Numbers
    /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,
    // Credit Card Numbers
    /\b(?:\d[ -]*?){13,16}\b/g
];

/**
 * Compiles an array of regex patterns from user input or defaults
 * @param {string|string[]|null} customPatterns - Optional custom patterns
 * @returns {RegExp[]} Array of compiled regex patterns
 */
function compilePatterns(customPatterns = null) {
    if (!customPatterns) {
        return DEFAULT_PATTERNS;
    }

    const patterns = Array.isArray(customPatterns) 
        ? customPatterns 
        : customPatterns.split(',').map(p => p.trim());

    return patterns.map(pattern => {
        try {
            // If pattern is already a RegExp, return it
            if (pattern instanceof RegExp) return pattern;
            // Convert string pattern to RegExp, maintaining global flag
            const patternStr = pattern.replace(/^\/|\/[gimuy]*$/g, '');
            return new RegExp(patternStr, 'g');
        } catch (error) {
            console.error(`Invalid regex pattern: ${pattern}`);
            return null;
        }
    }).filter(Boolean);
}

/**
 * Identifies sensitive text in content based on provided patterns
 * @param {string} content - The HTML content to scan
 * @param {string|string[]|null} patterns - Optional custom regex patterns
 * @returns {Object} Object containing matches and their positions
 */
function identifySensitiveText(content, patterns = null) {
    const compiledPatterns = compilePatterns(patterns);
    const matches = [];

    compiledPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            matches.push({
                text: match[0],
                index: match.index,
                length: match[0].length,
                pattern: pattern.toString()
            });
        }
    });

    return {
        matches,
        count: matches.length
    };
}

/**
 * Creates a preview of the content with sensitive text highlighted
 * @param {string} content - The HTML content to process
 * @param {string|string[]|null} patterns - Optional custom regex patterns
 * @returns {string} HTML content with sensitive text highlighted
 */
function previewSensitiveContent(content, patterns = null) {
    const compiledPatterns = compilePatterns(patterns);
    let previewContent = content;

    // Process each pattern
    compiledPatterns.forEach(pattern => {
        previewContent = previewContent.replace(pattern, match => 
            `<mark class="redact-highlight">${match}</mark>`
        );
    });

    return previewContent;
}

/**
 * Redacts sensitive content by replacing matches with [REDACTED]
 * @param {string} content - The HTML content to process
 * @param {string|string[]|null} patterns - Optional custom regex patterns
 * @returns {string} Redacted HTML content
 */
function redactSensitiveContent(content, patterns = null) {
    console.log('Starting redaction process');
    console.log('Original content length:', content.length);
    
    const compiledPatterns = compilePatterns(patterns);
    console.log('Compiled patterns:', compiledPatterns.map(p => p.toString()));
    
    let redactedContent = content;

    // Process each pattern
    compiledPatterns.forEach(pattern => {
        const matchCount = (redactedContent.match(pattern) || []).length;
        console.log(`Found ${matchCount} matches for pattern:`, pattern.toString());
        redactedContent = redactedContent.replace(pattern, '[REDACTED]');
    });

    console.log('Redacted content length:', redactedContent.length);
    return redactedContent;
}

module.exports = {
    identifySensitiveText,
    previewSensitiveContent,
    redactSensitiveContent,
    DEFAULT_PATTERNS
};