// Add imports at the top of the file
import { createWorker } from 'tesseract.js';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

document.addEventListener('DOMContentLoaded', function() {
    const dropZone = document.querySelector('.drop-zone');
    const chooseFileBtn = document.querySelector('.drop-zone .btn-primary');
    const customDropdown = document.querySelector('.custom-dropdown');
    const selectedOption = document.getElementById('selectedOption');
    const optionsContainer = document.getElementById('optionsContainer');
    const options = document.querySelectorAll('.option');
    const stepText = document.querySelector('.steps .step:nth-child(2) span:last-child');

    // Only create and insert the conversion panel if dropZone exists
    if (dropZone) {
        // Create conversion options panel
        const optionsPanel = document.createElement('div');
        optionsPanel.className = 'conversion-panel';
        optionsPanel.innerHTML = `
            <div class="conversion-content">
                <div class="selected-files"></div>
                <div class="conversion-options">
                    <div class="text-extraction-options" style="display: none;">
                        <h3>Text Extraction Options</h3>
                        <div class="option-group">
                            <label>Language:</label>
                            <select id="language">
                                <option value="eng">English</option>
                                <option value="fra">French</option>
                                <option value="deu">German</option>
                                <option value="spa">Spanish</option>
                            </select>
                        </div>
                    </div>
                    <div class="pdf-options" style="display: none;">
                        <h3>PDF Options</h3>
                        <div class="option-group">
                            <label>Page Size:</label>
                            <select id="pageSize">
                                <option value="a4">A4</option>
                                <option value="letter">Letter</option>
                                <option value="legal">Legal</option>
                            </select>
                        </div>
                        <div class="option-group">
                            <label>Orientation:</label>
                            <select id="orientation">
                                <option value="portrait">Portrait</option>
                                <option value="landscape">Landscape</option>
                            </select>
                        </div>
                    </div>
                    <div class="compression-options" style="display: none;">
                        <h3>Compression Options</h3>
                        <div class="option-group">
                            <label>Compression Level:</label>
                            <select id="compressionLevel">
                                <option value="low">Low (Larger file size, better quality)</option>
                                <option value="medium" selected>Medium (Balanced)</option>
                                <option value="high">High (Smaller file size, lower quality)</option>
                            </select>
                        </div>
                        <div class="option-group">
                            <label>Target Size Reduction:</label>
                            <div class="slider-container">
                                <input type="range" id="targetReduction" min="10" max="90" value="50" step="10">
                                <span id="targetReductionValue">50%</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="conversion-result" style="display: none;">
                    <div class="status-message"></div>
                    <div class="preview-container"></div>
                    <button class="btn-primary download-btn" style="display: none;">Download</button>
                </div>
            </div>
        `;

        // Insert options panel after drop zone
        dropZone.parentNode.insertBefore(optionsPanel, dropZone.nextSibling);

        // Add event listener for target reduction slider
        const targetReduction = document.getElementById('targetReduction');
        const targetReductionValue = document.getElementById('targetReductionValue');
        if (targetReduction && targetReductionValue) {
            targetReduction.addEventListener('input', (e) => {
                targetReductionValue.textContent = `${e.target.value}%`;
            });
        }
    }

    // Event Listeners
    selectedOption.addEventListener('click', () => {
        customDropdown.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!customDropdown.contains(e.target)) {
            customDropdown.classList.remove('active');
        }
    });

    options.forEach(option => {
        option.addEventListener('click', () => {
            const value = option.getAttribute('data-value');
            const text = option.textContent.trim();
            const iconSvg = option.querySelector('svg').cloneNode(true);
            
            selectedOption.innerHTML = '';
            selectedOption.appendChild(iconSvg);
            selectedOption.appendChild(document.createTextNode(text));
            
            stepText.textContent = `Convert to ${text}`;
            
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            
            customDropdown.classList.remove('active');
            updateOptionsVisibility(value);
        });
    });

    function updateOptionsVisibility(value) {
        const textOptions = document.querySelector('.text-extraction-options');
        const pdfOptions = document.querySelector('.pdf-options');
        const compressionOptions = document.querySelector('.compression-options');
        const conversionPanel = document.querySelector('.conversion-panel');
        const resultPanel = document.querySelector('.conversion-result');

        conversionPanel.style.display = 'block';
        textOptions.style.display = 'none';
        pdfOptions.style.display = 'none';
        compressionOptions.style.display = 'none';
        resultPanel.style.display = 'none';

        if (value === 'image-text') {
            textOptions.style.display = 'block';
        } else if (value === 'image-pdf') {
            pdfOptions.style.display = 'block';
        } else if (value === 'pdf-compress') {
            compressionOptions.style.display = 'block';
        }
    }

    // File handling
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    dropZone.addEventListener('drop', handleDrop, false);

    async function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        await handleFiles(files);
    }

    chooseFileBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.jpg,.jpeg,.png,.gif,.pdf';
        input.style.display = 'none';
        
        input.onchange = async (e) => {
            await handleFiles(e.target.files);
            document.body.removeChild(input);
        };
        
        document.body.appendChild(input);
        input.click();
    });

    async function handleFiles(files) {
        const selectedValue = document.querySelector('.option.selected')?.getAttribute('data-value');
        const file = files[0];
        if (!file) return;

        const selectedFilesDiv = document.querySelector('.selected-files');
        selectedFilesDiv.innerHTML = `
            <div class="selected-file">
                <span>${file.name}</span>
                <small>(${(file.size / (1024 * 1024)).toFixed(2)} MB)</small>
            </div>
        `;

        if (selectedValue === 'image-text') {
            await processImageToText(file);
        } else if (selectedValue === 'image-pdf') {
            await processImageToPdf(file);
        } else if (selectedValue === 'pdf-compress') {
            await compressPdf(file);
        }
    }

    async function processImageToText(file) {
        const resultPanel = document.querySelector('.conversion-result');
        const statusMessage = resultPanel.querySelector('.status-message');
        const previewContainer = resultPanel.querySelector('.preview-container');
        const downloadBtn = resultPanel.querySelector('.download-btn');

        resultPanel.style.display = 'block';
        statusMessage.textContent = 'Converting...';
        previewContainer.innerHTML = '';
        downloadBtn.style.display = 'none';

        try {
            // Validate file type
            const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!validImageTypes.includes(file.type)) {
                throw new Error('Please select a valid image file (JPEG, PNG, or GIF)');
            }

            // Validate file size (max 10MB)
            const maxSize = 10 * 1024 * 1024; // 10MB in bytes
            if (file.size > maxSize) {
                throw new Error('Image size exceeds 10MB limit');
            }

            // Create a blob URL for the image
            const imageUrl = URL.createObjectURL(file);

            // Load and validate the image
            await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    // Check image dimensions
                    if (img.width === 0 || img.height === 0) {
                        reject(new Error('Invalid image dimensions'));
                    }
                    resolve();
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = imageUrl;
            });

            const worker = await createWorker();
            const language = document.getElementById('language').value;

            await worker.loadLanguage(language);
            await worker.initialize(language);
            
            const result = await worker.recognize(file);
            await worker.terminate();

            // Clean up the blob URL
            URL.revokeObjectURL(imageUrl);

            if (!result || !result.data || !result.data.text) {
                throw new Error('No text could be extracted from the image');
            }

            const extractedText = result.data.text.trim();
            
            if (extractedText.length === 0) {
                throw new Error('No text was found in the image');
            }
            
            previewContainer.innerHTML = `
                <textarea class="text-preview" readonly>${extractedText}</textarea>
            `;
            
            statusMessage.textContent = 'Text extracted successfully!';
            statusMessage.classList.remove('error-message');
            statusMessage.classList.add('success-message');
            downloadBtn.style.display = 'block';
            
            downloadBtn.onclick = () => {
                const blob = new Blob([extractedText], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `${file.name.split('.')[0]}.txt`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };
        } catch (error) {
            console.error('Text extraction error:', error);
            statusMessage.textContent = `Error: ${error.message || 'Failed to extract text from image'}`;
            statusMessage.classList.remove('success-message');
            statusMessage.classList.add('error-message');
            downloadBtn.style.display = 'none';
            previewContainer.innerHTML = '';
        }
    }

    async function processImageToPdf(file) {
        const resultPanel = document.querySelector('.conversion-result');
        const statusMessage = resultPanel.querySelector('.status-message');
        const previewContainer = resultPanel.querySelector('.preview-container');
        const downloadBtn = resultPanel.querySelector('.download-btn');

        resultPanel.style.display = 'block';
        statusMessage.textContent = 'Converting...';
        statusMessage.className = 'status-message';
        previewContainer.innerHTML = '';
        downloadBtn.style.display = 'none';

        try {
            const pageSize = document.getElementById('pageSize').value;
            const orientation = document.getElementById('orientation').value;
            
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                try {
                    // Get page dimensions based on selected size
                    let pdfDimensions;
                    switch(pageSize) {
                        case 'a4':
                            pdfDimensions = orientation === 'portrait' ? [210, 297] : [297, 210];
                            break;
                        case 'letter':
                            pdfDimensions = orientation === 'portrait' ? [215.9, 279.4] : [279.4, 215.9];
                            break;
                        case 'legal':
                            pdfDimensions = orientation === 'portrait' ? [215.9, 355.6] : [355.6, 215.9];
                            break;
                        default:
                            pdfDimensions = [210, 297];
                    }

                    const pdf = new jsPDF({
                        orientation: orientation,
                        unit: 'mm',
                        format: pdfDimensions
                    });

                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    
                    const imgAspectRatio = img.width / img.height;
                    const pdfAspectRatio = pdfWidth / pdfHeight;
                    
                    let finalWidth, finalHeight;
                    
                    if (imgAspectRatio > pdfAspectRatio) {
                        finalWidth = pdfWidth;
                        finalHeight = finalWidth / imgAspectRatio;
                    } else {
                        finalHeight = pdfHeight;
                        finalWidth = finalHeight * imgAspectRatio;
                    }
                    
                    const x = (pdfWidth - finalWidth) / 2;
                    const y = (pdfHeight - finalHeight) / 2;
                    
                    pdf.addImage(img, 'JPEG', x, y, finalWidth, finalHeight);
                    
                    const pdfDataUri = pdf.output('datauristring');
                    previewContainer.innerHTML = `
                        <iframe src="${pdfDataUri}" width="100%" height="500px"></iframe>
                    `;
                    
                    statusMessage.textContent = 'PDF created successfully!';
                    statusMessage.classList.add('success-message');
                    downloadBtn.style.display = 'block';
                    
                    downloadBtn.onclick = () => {
                        pdf.save(`${file.name.split('.')[0]}.pdf`);
                    };
                } catch (error) {
                    console.error('PDF creation error:', error);
                    statusMessage.textContent = `Error: ${error.message || 'Failed to create PDF'}`;
                    statusMessage.classList.add('error-message');
                }
                
                URL.revokeObjectURL(imageUrl);
            };
            
            img.onerror = (error) => {
                console.error('Image loading error:', error);
                statusMessage.textContent = 'Error: Failed to load image';
                statusMessage.classList.add('error-message');
                URL.revokeObjectURL(imageUrl);
            };
            
            img.src = imageUrl;
        } catch (error) {
            console.error('PDF conversion error:', error);
            statusMessage.textContent = `Error: ${error.message || 'Failed to convert image to PDF'}`;
            statusMessage.classList.add('error-message');
        }
    }

    async function compressPdf(file) {
        const resultPanel = document.querySelector('.conversion-result');
        const statusMessage = resultPanel.querySelector('.status-message');
        const previewContainer = resultPanel.querySelector('.preview-container');
        const downloadBtn = resultPanel.querySelector('.download-btn');

        resultPanel.style.display = 'block';
        statusMessage.textContent = 'Compressing PDF...';
        statusMessage.className = 'status-message';
        previewContainer.innerHTML = '';
        downloadBtn.style.display = 'none';

        try {
            // Validate file type
            if (!file.name.toLowerCase().endsWith('.pdf')) {
                throw new Error('Please select a valid PDF file');
            }

            // Validate file size (max 100MB)
            const maxSize = 100 * 1024 * 1024; // 100MB in bytes
            if (file.size > maxSize) {
                throw new Error('File size exceeds 100MB limit');
            }

            const compressionLevel = document.getElementById('compressionLevel').value;
            const targetReduction = document.getElementById('targetReduction').value;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('compression_level', compressionLevel);
            formData.append('target_percentage', targetReduction);

            statusMessage.textContent = 'Uploading and compressing PDF...';

            const response = await fetch('/compress', {
                method: 'POST',
                body: formData
            });

            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                // Parse JSON response (error case)
                try {
                    responseData = await response.json();
                    throw new Error(responseData.error || 'Failed to compress PDF');
                } catch (jsonError) {
                    if (jsonError instanceof SyntaxError) {
                        throw new Error('Invalid response from server');
                    }
                    throw jsonError;
                }
            } else {
                // Handle binary response (success case)
                const compressedPdfBlob = await response.blob();
                
                if (!compressedPdfBlob || compressedPdfBlob.size === 0) {
                    throw new Error('Received empty file from server');
                }

                if (!compressedPdfBlob.type.includes('pdf')) {
                    throw new Error('Invalid file type received from server');
                }

                const compressedPdfUrl = URL.createObjectURL(compressedPdfBlob);

                // Show preview
                previewContainer.innerHTML = `
                    <iframe src="${compressedPdfUrl}" width="100%" height="500px"></iframe>
                `;

                statusMessage.textContent = 'PDF compressed successfully!';
                statusMessage.classList.add('success-message');
                downloadBtn.style.display = 'block';

                downloadBtn.onclick = () => {
                    const link = document.createElement('a');
                    link.href = compressedPdfUrl;
                    link.download = `compressed_${file.name}`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(compressedPdfUrl);
                };
            }
        } catch (error) {
            console.error('PDF compression error:', error);
            statusMessage.textContent = `Error: ${error.message || 'Failed to compress PDF'}`;
            statusMessage.classList.add('error-message');
            downloadBtn.style.display = 'none';
            previewContainer.innerHTML = '';
        }
    }

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    function highlight(e) {
        dropZone.classList.add('highlight');
    }

    function unhighlight(e) {
        dropZone.classList.remove('highlight');
    }

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
        .conversion-panel {
            margin-top: 2rem;
            padding: 1.5rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: none;
        }

        .conversion-content {
            max-width: 600px;
            margin: 0 auto;
        }

        .selected-files {
            margin-bottom: 1rem;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .selected-file {
            padding: 0.5rem;
            background: #f8f9fa;
            border-radius: 4px;
            margin-bottom: 0.5rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .selected-file small {
            color: #666;
        }

        .text-extraction-options,
        .pdf-options {
            margin-bottom: 1.5rem;
        }

        .option-group {
            margin-bottom: 1rem;
            display: flex;
            align-items: center;
            gap: 1rem;
        }

        .option-group label {
            min-width: 100px;
        }

        .option-group select {
            flex: 1;
            padding: 0.5rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .conversion-result {
            margin-top: 1.5rem;
            padding-top: 1.5rem;
            border-top: 1px solid var(--border-color);
        }

        .status-message {
            margin-bottom: 1rem;
            text-align: center;
            padding: 10px;
            border-radius: 4px;
            font-weight: 500;
        }

        .success-message {
            color: #0f5132;
            background-color: #d1e7dd;
            border: 1px solid #badbcc;
        }

        .error-message {
            color: #842029;
            background-color: #f8d7da;
            border: 1px solid #f5c2c7;
        }

        .preview-container {
            margin-bottom: 1rem;
        }

        .text-preview {
            width: 100%;
            min-height: 200px;
            padding: 1rem;
            border: 1px solid var(--border-color);
            border-radius: 4px;
            font-family: monospace;
            resize: vertical;
            background: #f8f9fa;
        }

        .download-btn {
            width: 100%;
            margin-top: 1rem;
        }

        iframe {
            border: 1px solid var(--border-color);
            border-radius: 4px;
        }

        .slider-container {
            display: flex;
            align-items: center;
            gap: 1rem;
            flex: 1;
        }

        input[type="range"] {
            flex: 1;
            height: 8px;
            border-radius: 4px;
            background: #ddd;
            outline: none;
            -webkit-appearance: none;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 20px;
            height: 20px;
            background: var(--primary-color);
            border-radius: 50%;
            cursor: pointer;
        }

        #targetReductionValue {
            min-width: 48px;
            text-align: right;
        }
    `;
    document.head.appendChild(style);

    // Registration Panel Functionality
    const createAccountBtn = document.getElementById('createAccountBtn');
    const closeRegisterBtn = document.getElementById('closeRegisterBtn');
    const registrationPanel = document.querySelector('.registration-panel');
    const registerForm = document.querySelector('.register-form');

    if (createAccountBtn) {
        createAccountBtn.addEventListener('click', () => {
            registrationPanel.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeRegisterBtn) {
        closeRegisterBtn.addEventListener('click', () => {
            registrationPanel.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // Close registration panel when clicking outside
    document.addEventListener('click', (e) => {
        if (registrationPanel && registrationPanel.classList.contains('active') && 
            !registrationPanel.contains(e.target) && 
            e.target !== createAccountBtn) {
            registrationPanel.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            alert('Account created successfully!');
            registrationPanel.classList.remove('active');
            document.body.style.overflow = '';
            registerForm.reset();
        });
    }

    // Coming Soon Popup Functionality
    const tryProBtn = document.getElementById('tryProBtn');
    const comingSoonPopup = document.getElementById('comingSoonPopup');
    const closePopupBtn = document.getElementById('closePopupBtn');

    if (tryProBtn) {
        tryProBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            comingSoonPopup.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', () => {
            comingSoonPopup.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (comingSoonPopup) {
        comingSoonPopup.addEventListener('click', (e) => {
            if (e.target === comingSoonPopup) {
                comingSoonPopup.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});