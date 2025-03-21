const express = require('express');
const path = require('path');
const { processHTMLFilesForPreview, processHTMLFilesForRedaction } = require('./services/fileProcessor');

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Preview endpoint
app.post('/preview', async (req, res) => {
    try {
        const { folder, patterns } = req.body;
        
        if (!folder) {
            return res.status(400).json({
                success: false,
                error: 'Folder path is required'
            });
        }

        const folderPath = path.resolve(process.cwd(), folder);
        console.log('Processing folder:', folderPath);
        console.log('Current working directory:', process.cwd());
        console.log('Directory exists:', require('fs').existsSync(folderPath));
        
        const result = await processHTMLFilesForPreview(folderPath, patterns);
        console.log('Preview result:', result);

        if (!result.success) {
            console.log('Preview failed:', result.error);
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            success: false,
            error: `Server error: ${error.message}`
        });
    }
});

// Redaction endpoint
app.post('/redact', async (req, res) => {
    try {
        const { folder, patterns } = req.body;
        
        if (!folder) {
            return res.status(400).json({
                success: false,
                error: 'Folder path is required'
            });
        }

        const folderPath = path.resolve(process.cwd(), folder);
        const outputFolder = path.join(path.dirname(folderPath), `${path.basename(folderPath)}_redacted`);
        
        const result = await processHTMLFilesForRedaction(
            folderPath,
            outputFolder,
            patterns
        );

        if (!result.success) {
            return res.status(500).json({
                success: false,
                error: result.error
            });
        }

        res.json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            error: `Server error: ${error.message}`
        });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});