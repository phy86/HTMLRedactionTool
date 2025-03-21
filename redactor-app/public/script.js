console.log('script.js loading...');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded');
    
    // DOM Elements
    const form = document.getElementById('redactForm');
    console.log('Form element:', form);
    
    const folderPathInput = document.getElementById('folderPath');
    const patternsInput = document.getElementById('patterns');
    const previewBtn = document.getElementById('previewBtn');
    const redactBtn = document.getElementById('redactBtn');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMessage = document.getElementById('errorMessage');
    const previewResults = document.getElementById('previewResults');
    const previewContent = document.getElementById('previewContent');
    const redactionResults = document.getElementById('redactionResults');
    const redactionContent = document.getElementById('redactionContent');

    if (!form || !folderPathInput || !previewBtn) {
        console.error('Required DOM elements not found:', {
            form: !!form,
            folderPathInput: !!folderPathInput,
            previewBtn: !!previewBtn
        });
        return;
    }

    // State
    let currentPreviewData = null;

    /**
     * Shows an error message
     * @param {string} message - Error message to display
     */
    function showError(message) {
        errorMessage.querySelector('span').textContent = message;
        errorMessage.classList.remove('hidden');
        errorMessage.classList.add('alert-animation');
        setTimeout(() => {
            errorMessage.classList.remove('alert-animation');
        }, 300);
    }

    /**
     * Hides the error message
     */
    function hideError() {
        errorMessage.classList.add('hidden');
    }

    /**
     * Shows the loading indicator
     */
    function showLoading() {
        loadingIndicator.classList.remove('hidden');
        previewBtn.disabled = true;
        redactBtn.disabled = true;
    }

    /**
     * Hides the loading indicator
     */
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
        previewBtn.disabled = false;
        redactBtn.disabled = !currentPreviewData;
    }

    /**
     * Creates a file preview card element
     * @param {string} filePath - Path to the file
     * @param {string} content - HTML content with highlighted sensitive data
     * @returns {HTMLElement} The preview card element
     */
    function createFilePreviewCard(filePath, content) {
        const card = document.createElement('div');
        card.className = 'file-preview';

        const header = document.createElement('div');
        header.className = 'file-preview-header';
        header.innerHTML = `
            <i class="fas fa-file-code text-blue-500 mr-2"></i>
            <span class="font-medium text-gray-700">${filePath}</span>
        `;

        const contentDiv = document.createElement('div');
        contentDiv.className = 'file-preview-content';
        contentDiv.innerHTML = content;

        card.appendChild(header);
        card.appendChild(contentDiv);

        return card;
    }

    /**
     * Displays preview results
     * @param {Object} data - Preview results data
     */
    function displayPreviewResults(data) {
        previewContent.innerHTML = '';
        currentPreviewData = data;

        Object.entries(data.results).forEach(([filePath, content]) => {
            const card = createFilePreviewCard(filePath, content);
            previewContent.appendChild(card);
        });

        previewResults.classList.remove('hidden');
        redactionResults.classList.add('hidden');
        redactBtn.disabled = false;

        // Scroll to results
        previewResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Displays redaction results
     * @param {Object} data - Redaction results data
     */
    function displayRedactionResults(data) {
        redactionContent.innerHTML = `
            <div class="flex items-start">
                <i class="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
                <div>
                    <p class="font-medium">Redaction completed successfully!</p>
                    <p class="mt-2">Processed ${data.fileCount} files.</p>
                    <p class="mt-1">Redacted files are available in: ${data.outputFolder}</p>
                </div>
            </div>
        `;

        redactionResults.classList.remove('hidden');
        redactionResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    /**
     * Handles the preview button click
     * @param {Event} e - Click event
     */
    async function handlePreview(e) {
        console.log('Preview button clicked');
        e.preventDefault();
        hideError();
        
        // Get and validate folder path
        const folderPath = folderPathInput.value.trim();
        console.log('Raw folder path value:', folderPathInput.value);
        console.log('Trimmed folder path:', folderPath);

        if (!folderPath) {
            console.log('Folder path is empty');
            showError('Please enter a folder path');
            return;
        }

        // Get custom patterns and text
        const patterns = patternsInput.value.trim();
        const customText = document.getElementById('customText').value.trim();
        console.log('Submitting preview request:', { folderPath, patterns, customText });

        try {
            showLoading();
            console.log('Making fetch request to /preview');
            const response = await fetch('/preview', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folder: folderPath,
                    patterns: patterns || null,
                    customText: customText || null
                }),
            });

            console.log('Preview response status:', response.status);
            const data = await response.json();
            console.log('Preview response data:', data);

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            if (!data.success) {
                throw new Error(data.error || 'Failed to process preview');
            }

            if (data.fileCount === 0) {
                throw new Error('No HTML files found in the specified directory');
            }

            displayPreviewResults(data);
        } catch (error) {
            console.error('Preview error:', error);
            showError(error.message);
            previewResults.classList.add('hidden');
            redactBtn.disabled = true;
        } finally {
            hideLoading();
        }
    }

    /**
     * Handles the redact button click
     * @param {Event} e - Click event
     */
    async function handleRedact(e) {
        e.preventDefault();
        hideError();

        if (!currentPreviewData) {
            showError('Please preview the content first');
            return;
        }

        const folderPath = folderPathInput.value.trim();
        const patterns = patternsInput.value.trim();
        const customText = document.getElementById('customText').value.trim();

        try {
            showLoading();
            const response = await fetch('/redact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    folder: folderPath,
                    patterns: patterns || null,
                    customText: customText || null
                }),
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error || 'Failed to process redaction');
            }

            displayRedactionResults(data);
        } catch (error) {
            showError(error.message);
            redactionResults.classList.add('hidden');
        } finally {
            hideLoading();
        }
    }

    // Event Listeners
    console.log('Setting up event listeners');
    console.log('Preview button:', previewBtn);
    
    previewBtn.addEventListener('click', handlePreview);
    console.log('Preview button click handler attached');
    
    redactBtn.addEventListener('click', handleRedact);
    console.log('Redact button click handler attached');

    // Form submission prevention
    form.addEventListener('submit', (e) => {
        console.log('Form submission prevented');
        e.preventDefault();
    });

    // Input validation and real-time error clearing
    folderPathInput.addEventListener('input', () => {
        if (errorMessage.classList.contains('hidden')) return;
        hideError();
    });
});