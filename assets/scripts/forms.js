/**
 * Dynamic Forms System
 * Handles loading, rendering, and submitting configurable forms
 */

// Store form configuration and state
let formsConfig = null;
let formActivityConfig = null;
let currentFormType = null;
let selectedFiles = [];
let semesterSubjectMappings = {};
let formsShownThisSession = 0;
let lastFormShownTime = 0;
let currentWizardPage = 0; // For multi-page wizard forms

// Initialize on page load
document.addEventListener('DOMContentLoaded', function () {
    loadFormsConfig();
    loadSemesterSubjectMappingsForForms();
    loadFormActivityConfig();
});

/**
 * Load forms configuration from JSON
 */
async function loadFormsConfig() {
    try {
        const response = await fetch('/assets/data/forms-config.json');
        if (response.ok) {
            formsConfig = await response.json();

        }
    } catch (error) {

    }
}

/**
 * Load semester-subject mappings for dynamic subject dropdown
 */
async function loadSemesterSubjectMappingsForForms() {
    try {
        const response = await fetch('https:/cdn-materioa.vercel.app/databases/semester-subjects.json');
        if (response.ok) {
            semesterSubjectMappings = await response.json();
        }
    } catch (error) {

        // Use default mappings
        semesterSubjectMappings = {
            "1": ["Applied Mathematics 1", "Applied Physics 1", "Applied Chemistry", "Engineering Mechanics", "Basic Electrical Engineering"],
            "2": ["Applied Mathematics 2", "Applied Physics 2", "Engineering Drawing", "Environmental Studies", "Programming in C"],
            "3": ["Data Structures", "Digital Electronics", "Discrete Mathematics", "Computer Organization", "OOP using C++"],
            "4": ["Operating Systems", "Database Management", "Computer Networks", "Theory of Computation", "Microprocessors"],
            "5": ["Software Engineering", "Web Technologies", "Compiler Design", "Machine Learning", "Information Security"],
            "6": ["Artificial Intelligence", "Cloud Computing", "Big Data Analytics", "Mobile Computing", "IoT"],
            "7": ["Deep Learning", "Natural Language Processing", "Blockchain Technology", "Quantum Computing"],
            "8": ["Project Work", "Industrial Training", "Seminar"]
        };
    }
}

/**
 * Open the dynamic form modal with specified form type
 * @param {string} formType - Type of form to open (contribution, feedback, beta-review)
 * @param {boolean} skipWizard - Whether to skip the wizard and go straight to form
 */
function openDynamicForm(formType, skipWizard = false) {
    if (!formsConfig || !formsConfig.forms[formType]) {

        showNotification('Form not available', 'error');
        return;
    }

    currentFormType = formType;
    currentWizardPage = 0;
    const formConfig = formsConfig.forms[formType];
    const modal = document.getElementById('dynamicFormModal');

    if (!modal) {

        return;
    }

    // Reset states
    const successEl = document.getElementById('dynamicFormSuccess');
    const errorEl = document.getElementById('dynamicFormError');
    const loadingEl = document.getElementById('dynamicFormLoading');
    const submitBtn = document.getElementById('dynamicFormSubmitBtn');

    if (successEl) successEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    if (loadingEl) loadingEl.style.display = 'none';
    if (submitBtn) submitBtn.disabled = false;
    selectedFiles = [];

    // Check if this is a wizard form
    if (!skipWizard && formConfig.wizard && formConfig.wizard.enabled && formConfig.wizard.pages) {
        renderWizardPage(formConfig, 0);
    } else {
        renderStandardForm(formConfig);
    }

    // Show modal
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');

    // Initialize mobile swipe handling if available
    if (typeof initMobileSwipeHandling === 'function') {
        initMobileSwipeHandling();
    }
}

/**
 * Render standard form without wizard
 */
function renderStandardForm(formConfig) {
    const iconEl = document.getElementById('dynamicFormIcon');
    const titleEl = document.getElementById('dynamicFormTitle');
    const descEl = document.getElementById('dynamicFormDescription');
    const submitTextEl = document.getElementById('dynamicFormSubmitText');
    const submitIconEl = document.getElementById('dynamicFormSubmitIcon');
    const headerEl = document.querySelector('.dynamic-form-header');
    const contentWrapper = document.querySelector('.dynamic-form-content-wrapper');
    const actionsEl = document.querySelector('.dynamic-form-actions');
    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    const formContent = document.getElementById('dynamicFormContent');

    // Show header, actions, and confirmations
    if (headerEl) headerEl.style.display = '';
    if (actionsEl) actionsEl.style.display = '';
    if (confirmationsContainer) confirmationsContainer.style.display = '';

    // Restore margin
    if (formContent) formContent.style.marginBottom = '';

    if (contentWrapper) {
        contentWrapper.style.background = '';
        contentWrapper.style.padding = '';
    }

    // Update header
    if (iconEl) iconEl.className = `fa-solid ${formConfig.icon} dynamic-form-icon`;
    if (titleEl) titleEl.textContent = formConfig.title;
    if (descEl) descEl.textContent = formConfig.description;

    // Update submit button
    if (submitTextEl) submitTextEl.textContent = formConfig.submitButton.text;
    if (submitIconEl) submitIconEl.className = `fa-solid ${formConfig.submitButton.icon}`;

    // Render form fields
    renderFormFields(formConfig);

    // Focus trap for accessibility
    setTimeout(() => {
        const modal = document.getElementById('dynamicFormModal');
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 300);
}

/**
 * Render a wizard page
 */
function renderWizardPage(formConfig, pageIndex) {
    currentWizardPage = pageIndex;
    const page = formConfig.wizard.pages[pageIndex];
    const fieldsContainer = document.getElementById('dynamicFormFields');
    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    const headerEl = document.querySelector('.dynamic-form-header');
    const contentWrapper = document.querySelector('.dynamic-form-content-wrapper');
    const actionsEl = document.querySelector('.dynamic-form-actions');

    fieldsContainer.innerHTML = '';
    if (confirmationsContainer) confirmationsContainer.innerHTML = '';

    if (page.type === 'cover') {
        renderCoverPage(page, formConfig, pageIndex);
    } else if (page.type === 'info') {
        renderInfoPage(page, formConfig, pageIndex);
    } else if (page.type === 'form') {
        renderFormPage(page, formConfig);
    }
}

/**
 * Render cover page
 */
function renderCoverPage(page, formConfig, pageIndex) {
    const fieldsContainer = document.getElementById('dynamicFormFields');
    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    const headerEl = document.querySelector('.dynamic-form-header');
    const actionsEl = document.querySelector('.dynamic-form-actions');
    const contentWrapper = document.querySelector('.dynamic-form-content-wrapper');
    const formContent = document.getElementById('dynamicFormContent');

    // Hide default header, actions, and confirmations
    if (headerEl) headerEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';
    if (confirmationsContainer) confirmationsContainer.style.display = 'none';

    // Remove margin from form container
    if (formContent) formContent.style.marginBottom = '0';

    // Determine media type from extension
    const mediaUrl = page.backgroundImage || page.backgroundMedia;
    let isVideo = false;
    let mediaHtml = '';

    if (mediaUrl) {
        const ext = mediaUrl.split('.').pop().toLowerCase().split('?')[0];
        isVideo = ['webm', 'mp4', 'mov', 'ogg'].includes(ext);

        if (isVideo) {
            // Video background
            mediaHtml = `
                <video class="wizard-cover-video" autoplay loop muted playsinline>
                    <source src="${mediaUrl}" type="video/${ext === 'mov' ? 'quicktime' : ext}">
                </video>
            `;
        }
    }

    // Set background for images/gradients (not for video)
    if (contentWrapper) {
        if (!isVideo && mediaUrl) {
            const gradient = page.backgroundGradient ? `${page.backgroundGradient}, ` : '';
            contentWrapper.style.background = `${gradient}url('${mediaUrl}') center/cover`;
        } else if (page.backgroundGradient) {
            contentWrapper.style.background = page.backgroundGradient;
        } else if (isVideo) {
            contentWrapper.style.background = 'transparent';
        }
        contentWrapper.style.padding = '0';
    }

    fieldsContainer.innerHTML = `
        <div class="wizard-cover-page">
            ${mediaHtml}
            ${isVideo && page.backgroundGradient ? `<div class="wizard-cover-overlay" style="background: ${page.backgroundGradient}"></div>` : ''}
            <div class="wizard-cover-content">
                <i class="${page.icon} wizard-cover-icon"></i>
                <h1 class="wizard-cover-title">${page.title}</h1>
                <p class="wizard-cover-subtitle">${page.subtitle || ''}</p>
                <button type="button" class="wizard-next-btn" onclick="goToWizardPage(${pageIndex + 1})">
                    ${page.nextButton.text}
                    ${page.nextButton.icon ? `<i class="fa-solid ${page.nextButton.icon}"></i>` : ''}
                </button>
            </div>
        </div>
    `;
}

/**
 * Render info/explanation page
 */
function renderInfoPage(page, formConfig, pageIndex) {
    const fieldsContainer = document.getElementById('dynamicFormFields');
    const headerEl = document.querySelector('.dynamic-form-header');
    const actionsEl = document.querySelector('.dynamic-form-actions');
    const contentWrapper = document.querySelector('.dynamic-form-content-wrapper');

    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    const formContent = document.getElementById('dynamicFormContent');

    // Hide default header, actions, and confirmations
    if (headerEl) headerEl.style.display = 'none';
    if (actionsEl) actionsEl.style.display = 'none';
    if (confirmationsContainer) confirmationsContainer.style.display = 'none';

    // Remove margin from form container (info page handles its own spacing)
    if (formContent) formContent.style.marginBottom = '0';

    if (contentWrapper) {
        contentWrapper.style.background = '';
        contentWrapper.style.padding = '';
    }

    let contentHtml = '';
    if (page.content && Array.isArray(page.content)) {
        contentHtml = page.content.map(item => {
            // Handle simple string content
            if (typeof item === 'string') {
                return `<p class="wizard-info-paragraph">${item}</p>`;
            }

            // Handle object content (cards or simple text with title)
            if (typeof item === 'object') {
                // If it has an icon, render as a card
                if (item.icon) {
                    return `
                        <div class="wizard-info-item">
                            <div class="wizard-info-icon"><i class="${item.icon}"></i></div>
                            <div class="wizard-info-text">
                                ${item.title ? `<h4>${item.title}</h4>` : ''}
                                <p>${item.description || ''}</p>
                            </div>
                        </div>
                    `;
                }

                // If no icon but has title/description, render as titled text
                return `
                    <div class="wizard-info-text-block">
                        ${item.title ? `<h4>${item.title}</h4>` : ''}
                        ${item.description ? `<p>${item.description}</p>` : ''}
                    </div>
                `;
            }
            return '';
        }).join('');
    }

    fieldsContainer.innerHTML = `
        <div class="wizard-info-page">
            <h2 class="wizard-info-title">${page.title}</h2>
            <div class="wizard-info-content">
                ${contentHtml}
            </div>
            <div class="wizard-info-actions">
                <button type="button" class="wizard-continue-btn" onclick="goToWizardPage(${pageIndex + 1})">
                    ${page.continueButton.text}
                    ${page.continueButton.icon ? `<i class="fa-solid ${page.continueButton.icon}"></i>` : ''}
                </button>
                <button type="button" class="wizard-exit-btn" onclick="closeDynamicForm()">
                    ${page.exitButton.icon ? `<i class="fa-solid ${page.exitButton.icon}"></i>` : ''}
                    ${page.exitButton.text}
                </button>
            </div>
        </div>
    `;
}

/**
 * Render the actual form page
 */
function renderFormPage(page, formConfig) {
    const headerEl = document.querySelector('.dynamic-form-header');
    const actionsEl = document.querySelector('.dynamic-form-actions');
    const contentWrapper = document.querySelector('.dynamic-form-content-wrapper');
    const iconEl = document.getElementById('dynamicFormIcon');
    const titleEl = document.getElementById('dynamicFormTitle');
    const descEl = document.getElementById('dynamicFormDescription');
    const submitTextEl = document.getElementById('dynamicFormSubmitText');
    const submitIconEl = document.getElementById('dynamicFormSubmitIcon');

    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    const formContent = document.getElementById('dynamicFormContent');

    // Show header, actions, and confirmations
    if (headerEl) headerEl.style.display = '';
    if (actionsEl) actionsEl.style.display = '';
    if (confirmationsContainer) confirmationsContainer.style.display = '';

    // Restore margin
    if (formContent) formContent.style.marginBottom = '';

    if (contentWrapper) {
        contentWrapper.style.background = '';
        contentWrapper.style.padding = '';
    }

    // Update header with page-specific or form default
    if (iconEl) iconEl.className = `fa-solid ${formConfig.icon} dynamic-form-icon`;
    if (titleEl) titleEl.textContent = page.title || formConfig.title;
    if (descEl) descEl.textContent = page.description || formConfig.description;

    // Update submit button
    if (submitTextEl) submitTextEl.textContent = formConfig.submitButton.text;
    if (submitIconEl) submitIconEl.className = `fa-solid ${formConfig.submitButton.icon}`;

    // Render form fields
    renderFormFields(formConfig);

    // Focus first input
    setTimeout(() => {
        const modal = document.getElementById('dynamicFormModal');
        const firstInput = modal.querySelector('input, select, textarea');
        if (firstInput) firstInput.focus();
    }, 300);
}

/**
 * Navigate to a specific wizard page
 */
function goToWizardPage(pageIndex) {
    if (!currentFormType || !formsConfig) return;
    const formConfig = formsConfig.forms[currentFormType];

    if (formConfig.wizard && formConfig.wizard.pages && pageIndex < formConfig.wizard.pages.length) {
        renderWizardPage(formConfig, pageIndex);
    }
}

/**
 * Close the dynamic form modal
 */
function closeDynamicForm() {
    const modal = document.getElementById('dynamicFormModal');
    if (!modal) return;

    // Add closing animation - works on both mobile and desktop
    const formModalElement = modal.querySelector('.dynamic-form-modal');
    if (formModalElement) {
        // Prepare for animation
        formModalElement.style.willChange = 'transform, opacity';
        formModalElement.classList.add('closing');

        // Animate overlay fade out
        modal.style.transition = 'opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
        modal.style.opacity = '0';

        // Wait for animation to finish before hiding
        setTimeout(() => {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            modal.style.opacity = '';
            modal.style.transition = '';
            formModalElement.classList.remove('closing');
            formModalElement.style.willChange = '';
            formModalElement.style.transform = '';
            document.body.classList.remove('modal-open');

            // Reset form state
            resetFormState();
        }, 400);
    } else {
        // Fallback if modal element doesn't exist
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
        resetFormState();
    }
}

/**
 * Reset form state after closing
 */
function resetFormState() {
    currentFormType = null;
    selectedFiles = [];

    // Clear dynamic fields
    const fieldsContainer = document.getElementById('dynamicFormFields');
    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');
    if (fieldsContainer) fieldsContainer.innerHTML = '';
    if (confirmationsContainer) confirmationsContainer.innerHTML = '';

    // Hide success/error states
    const successState = document.getElementById('dynamicFormSuccess');
    const errorState = document.getElementById('dynamicFormError');
    if (successState) successState.style.display = 'none';
    if (errorState) errorState.style.display = 'none';

    // Reset submit button
    const submitBtn = document.getElementById('dynamicFormSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i id="dynamicFormSubmitIcon" class="fa-solid fa-paper-plane" style="margin-right: 8px;"></i><span id="dynamicFormSubmitText">Submit</span>';
    }
}

/**
 * Reset form to initial state after error
 */
function resetDynamicForm() {
    document.getElementById('dynamicFormError').style.display = 'none';
    document.getElementById('dynamicFormSubmitBtn').disabled = false;

    // Re-render fields
    if (currentFormType && formsConfig) {
        renderFormFields(formsConfig.forms[currentFormType]);
    }
}

/**
 * Render form fields based on configuration
 * @param {Object} formConfig - Form configuration object
 */
function renderFormFields(formConfig) {
    const fieldsContainer = document.getElementById('dynamicFormFields');
    const confirmationsContainer = document.getElementById('dynamicFormConfirmations');

    fieldsContainer.innerHTML = '';
    confirmationsContainer.innerHTML = '';

    // Render each field
    formConfig.fields.forEach(field => {
        const fieldElement = createFieldElement(field);
        if (fieldElement) {
            fieldsContainer.appendChild(fieldElement);
        }
    });

    // Render confirmations
    if (formConfig.confirmations && formConfig.confirmations.length > 0) {
        formConfig.confirmations.forEach(confirmation => {
            const confirmElement = createConfirmationElement(confirmation);
            confirmationsContainer.appendChild(confirmElement);
        });
    }

    // Setup conditional visibility
    setupConditionalFields(formConfig.fields);
}

/**
 * Create a form field element based on field configuration
 * @param {Object} field - Field configuration
 * @returns {HTMLElement} - The field element
 */
function createFieldElement(field) {
    const group = document.createElement('div');
    group.className = 'dynamic-form-group';
    group.id = `field-group-${field.name}`;

    // Create label
    const label = document.createElement('label');
    label.setAttribute('for', `field-${field.name}`);
    label.innerHTML = field.label + (field.required ? '<span class="required">*</span>' : '');
    group.appendChild(label);

    // Create input based on type
    let input;
    switch (field.type) {
        case 'text':
        case 'email':
            input = document.createElement('input');
            input.type = field.type;
            input.id = `field-${field.name}`;
            input.name = field.name;
            input.placeholder = field.placeholder || '';
            input.required = field.required || false;
            if (field.maxLength) input.maxLength = field.maxLength;
            break;

        case 'select':
            input = document.createElement('select');
            input.id = `field-${field.name}`;
            input.name = field.name;
            input.required = field.required || false;

            // Add placeholder option
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = `Select ${field.label}`;
            placeholder.disabled = true;

            // Check if user is logged in for identity field
            const isLoggedIn = !!localStorage.getItem('materio_user');
            const isIdentityField = field.name === 'userIdentity';

            // Only select placeholder if not identity field or not logged in
            placeholder.selected = !(isIdentityField && isLoggedIn);
            input.appendChild(placeholder);

            // Add options
            if (field.options) {
                field.options.forEach(opt => {
                    const option = document.createElement('option');
                    option.value = opt.value;
                    option.textContent = opt.label;

                    // Pre-select 'authenticated' if logged in and this is identity field
                    if (isIdentityField && isLoggedIn && opt.value === 'authenticated') {
                        option.selected = true;
                    }

                    input.appendChild(option);
                });
            }

            // Special handling for semester field - add change listener for subject
            if (field.dynamicSubject) {
                input.addEventListener('change', function () {
                    populateSubjectsForForm(this.value);
                });
            }

            // Add "Other" option if allowed
            if (field.allowOther && !field.dynamicFromSemester) {
                const otherOption = document.createElement('option');
                otherOption.value = '__other__';
                otherOption.textContent = 'Other';
                input.appendChild(otherOption);
            }
            break;

        case 'textarea':
            input = document.createElement('textarea');
            input.id = `field-${field.name}`;
            input.name = field.name;
            input.placeholder = field.placeholder || '';
            input.required = field.required || false;
            input.rows = 4;
            if (field.maxLength) input.maxLength = field.maxLength;
            if (field.minLength) input.minLength = field.minLength;
            break;

        case 'file':
            const fileArea = createFileUploadArea(field);
            group.appendChild(fileArea);
            return group;

        case 'rating':
            input = createRatingField(field);
            break;

        default:
            input = document.createElement('input');
            input.type = 'text';
            input.id = `field-${field.name}`;
            input.name = field.name;
    }

    if (input) {
        group.appendChild(input);
    }

    // Add hint if present
    if (field.hint) {
        const hint = document.createElement('small');
        hint.className = 'field-hint';
        hint.textContent = field.hint;
        group.appendChild(hint);
    }

    // Add custom input for "Other" option
    if (field.allowOther) {
        const customInput = document.createElement('input');
        customInput.type = 'text';
        customInput.id = `field-${field.name}-custom`;
        customInput.name = `${field.name}_custom`;
        customInput.placeholder = field.otherPlaceholder || 'Enter custom value';
        customInput.style.display = 'none';
        customInput.style.marginTop = '8px';
        group.appendChild(customInput);

        // Show/hide custom input based on selection
        if (input && input.tagName === 'SELECT') {
            input.addEventListener('change', function () {
                customInput.style.display = this.value === '__other__' ? 'block' : 'none';
                if (this.value === '__other__') {
                    customInput.required = field.required || false;
                    customInput.focus();
                } else {
                    customInput.required = false;
                }
            });
        }
    }

    return group;
}

/**
 * Create file upload area
 * @param {Object} field - File field configuration
 * @returns {HTMLElement} - File upload area element
 */
function createFileUploadArea(field) {
    const area = document.createElement('div');
    area.className = 'dynamic-form-file-area';
    area.id = `field-${field.name}-area`;

    area.innerHTML = `
    <i class="fas fa-cloud-upload-alt"></i>
    <p><strong>Drop files here</strong> or click to upload</p>
    <small>${field.hint || 'Select files to upload'}</small>
    <input type="file" id="field-${field.name}" name="${field.name}" 
           ${field.accept ? `accept="${field.accept}"` : ''} 
           ${field.multiple ? 'multiple' : ''}>
  `;

    const fileInput = area.querySelector('input[type="file"]');
    const previewContainer = document.createElement('div');
    previewContainer.className = 'dynamic-form-file-preview';
    previewContainer.id = `field-${field.name}-preview`;

    // Click to select files
    area.addEventListener('click', () => fileInput.click());

    // Drag and drop
    area.addEventListener('dragover', (e) => {
        e.preventDefault();
        area.classList.add('dragover');
    });

    area.addEventListener('dragleave', () => {
        area.classList.remove('dragover');
    });

    area.addEventListener('drop', (e) => {
        e.preventDefault();
        area.classList.remove('dragover');
        handleFileSelection(e.dataTransfer.files, field);
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files, field);
    });

    // Wrap in container with preview
    const container = document.createElement('div');
    container.appendChild(area);
    container.appendChild(previewContainer);

    return container;
}

/**
 * Handle file selection
 * @param {FileList} files - Selected files
 * @param {Object} field - Field configuration
 */
function handleFileSelection(files, field) {
    const previewContainer = document.getElementById(`field-${field.name}-preview`);
    previewContainer.innerHTML = '';

    selectedFiles = Array.from(files);

    // Check total size
    const totalSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
    const maxSize = field.maxSize || 6291456; // 6MB default

    if (totalSize > maxSize) {
        showNotification(`Total file size exceeds ${field.maxSizeLabel || '6MB'} limit`, 'error');
        selectedFiles = [];
        return;
    }

    // Render preview items
    selectedFiles.forEach((file, index) => {
        const item = document.createElement('div');
        item.className = 'dynamic-form-file-item';
        item.innerHTML = `
      <i class="fas fa-file-pdf"></i>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button type="button" class="remove-file" onclick="removeSelectedFile(${index}, '${field.name}')">
        <i class="fas fa-times"></i>
      </button>
    `;
        previewContainer.appendChild(item);
    });
}

/**
 * Remove a selected file
 * @param {number} index - File index
 * @param {string} fieldName - Field name
 */
function removeSelectedFile(index, fieldName) {
    selectedFiles.splice(index, 1);
    const previewContainer = document.getElementById(`field-${fieldName}-preview`);

    // Re-render preview
    previewContainer.innerHTML = '';
    selectedFiles.forEach((file, i) => {
        const item = document.createElement('div');
        item.className = 'dynamic-form-file-item';
        item.innerHTML = `
      <i class="fas fa-file-pdf"></i>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
      <button type="button" class="remove-file" onclick="removeSelectedFile(${i}, '${fieldName}')">
        <i class="fas fa-times"></i>
      </button>
    `;
        previewContainer.appendChild(item);
    });
}

/**
 * Create rating field (star rating)
 * @param {Object} field - Field configuration
 * @returns {HTMLElement} - Rating element
 */
function createRatingField(field) {
    const container = document.createElement('div');
    container.className = 'dynamic-form-rating';
    container.id = `field-${field.name}`;

    const max = field.max || 5;
    let selectedRating = 0;

    for (let i = 1; i <= max; i++) {
        const star = document.createElement('i');
        star.className = 'fa-regular fa-star star';
        star.dataset.value = i;

        star.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            selectedRating = i;
            container.dataset.value = i;

            // Update all stars
            const allStars = container.querySelectorAll('.star');
            allStars.forEach((s, idx) => {
                if (idx < i) {
                    s.className = 'fa-solid fa-star star active';
                    s.style.color = '#ff8200';
                } else {
                    s.className = 'fa-regular fa-star star';
                    s.style.color = '';
                }
            });

            // Update hidden input
            const hiddenInput = container.querySelector('input[type="hidden"]');
            if (hiddenInput) {
                hiddenInput.value = i;
            }
        });

        star.addEventListener('mouseenter', function () {
            const allStars = container.querySelectorAll('.star');
            allStars.forEach((s, idx) => {
                if (idx < i) {
                    s.classList.add('hovered');
                }
            });
        });

        star.addEventListener('mouseleave', function () {
            const allStars = container.querySelectorAll('.star');
            allStars.forEach((s) => {
                s.classList.remove('hovered');
            });
        });

        container.appendChild(star);
    }

    // Hidden input for form data
    const hiddenInput = document.createElement('input');
    hiddenInput.type = 'hidden';
    hiddenInput.name = field.name;
    hiddenInput.id = `field-${field.name}-value`;
    container.appendChild(hiddenInput);

    return container;
}

/**
 * Update star display
 * @param {HTMLElement} container - Stars container
 * @param {number} rating - Current rating
 * @param {boolean} isHover - Whether it's a hover state
 */
function updateStars(container, rating, isHover = false) {
    const stars = container.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add(isHover ? 'hovered' : 'active');
            if (!isHover) star.classList.remove('hovered');
        } else {
            star.classList.remove('active', 'hovered');
        }
    });

    // Update hidden input
    const hiddenInput = container.querySelector('input[type="hidden"]');
    if (hiddenInput && !isHover) {
        hiddenInput.value = rating;
    }
}

/**
 * Create confirmation checkbox element
 * @param {Object} confirmation - Confirmation configuration
 * @returns {HTMLElement} - Confirmation element
 */
function createConfirmationElement(confirmation) {
    const container = document.createElement('div');
    container.className = 'dynamic-form-confirmation';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `confirm-${confirmation.name}`;
    checkbox.name = confirmation.name;
    checkbox.required = confirmation.required || false;

    const label = document.createElement('label');
    label.setAttribute('for', `confirm-${confirmation.name}`);
    label.textContent = confirmation.label;

    container.appendChild(checkbox);
    container.appendChild(label);

    return container;
}

/**
 * Setup conditional field visibility
 * @param {Array} fields - Field configurations
 */
function setupConditionalFields(fields) {
    fields.forEach(field => {
        if (field.showWhen) {
            const targetField = document.getElementById(`field-${field.showWhen.field}`);
            const currentFieldGroup = document.getElementById(`field-group-${field.name}`);

            if (targetField && currentFieldGroup) {
                // Initially hide
                currentFieldGroup.style.display = 'none';

                // Listen for changes
                targetField.addEventListener('change', function () {
                    if (this.value === field.showWhen.value) {
                        currentFieldGroup.style.display = 'flex';
                    } else {
                        currentFieldGroup.style.display = 'none';
                        // Clear value when hidden
                        const input = currentFieldGroup.querySelector('input, select, textarea');
                        if (input) input.value = '';
                    }
                });
            }
        }
    });
}

/**
 * Populate subjects dropdown based on selected semester
 * @param {string} semester - Selected semester value
 */
function populateSubjectsForForm(semester) {
    const subjectSelect = document.getElementById('field-subject');
    if (!subjectSelect) return;

    // Clear existing options
    subjectSelect.innerHTML = '';

    // Add placeholder
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select Subject';
    placeholder.disabled = true;
    placeholder.selected = true;
    subjectSelect.appendChild(placeholder);

    // Add subjects from mapping
    if (semester && semesterSubjectMappings[semester]) {
        semesterSubjectMappings[semester].forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject;
            subjectSelect.appendChild(option);
        });
    }

    // Add "Other" option
    const otherOption = document.createElement('option');
    otherOption.value = '__other__';
    otherOption.textContent = 'Other';
    subjectSelect.appendChild(otherOption);

    // Enable select
    subjectSelect.disabled = false;

    // Show/hide custom input
    subjectSelect.addEventListener('change', function () {
        const customInput = document.getElementById('field-subject-custom');
        if (customInput) {
            customInput.style.display = this.value === '__other__' ? 'block' : 'none';
            if (this.value === '__other__') {
                customInput.required = true;
                customInput.focus();
            } else {
                customInput.required = false;
            }
        }
    });
}

/**
 * Safely parse JSON from a fetch response, with fallback on non-JSON responses
 */
async function safeJsonParse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
        throw new Error(`Server error (${response.status}): Unexpected response from server`);
    }
    return response.json();
}

/**
 * Submit the dynamic form
 */
async function submitDynamicForm() {
    if (!currentFormType || !formsConfig) {
        showNotification('Form not initialized', 'error');
        return;
    }

    const formConfig = formsConfig.forms[currentFormType];
    const submitBtn = document.getElementById('dynamicFormSubmitBtn');
    const form = document.getElementById('dynamicFormContent');

    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Validate confirmations
    const confirmations = formConfig.confirmations || [];
    for (const conf of confirmations) {
        const checkbox = document.getElementById(`confirm-${conf.name}`);
        if (conf.required && checkbox && !checkbox.checked) {
            showNotification('Please confirm all required checkboxes', 'error');
            checkbox.focus();
            return;
        }
    }

    // Collect form data
    const formData = {};
    const confirmationData = {};

    formConfig.fields.forEach(field => {
        let value;

        if (field.type === 'file') {
            // Files handled separately
            return;
        } else if (field.type === 'rating') {
            const hiddenInput = document.getElementById(`field-${field.name}-value`);
            value = hiddenInput ? parseInt(hiddenInput.value) || 0 : 0;
        } else {
            const input = document.getElementById(`field-${field.name}`);
            if (input) {
                value = input.value;

                // Check for "Other" custom value
                if (value === '__other__') {
                    const customInput = document.getElementById(`field-${field.name}-custom`);
                    value = customInput ? customInput.value : '';
                }
            }
        }

        if (value !== undefined && value !== '') {
            formData[field.name] = value;
        }
    });

    confirmations.forEach(conf => {
        const checkbox = document.getElementById(`confirm-${conf.name}`);
        confirmationData[conf.name] = checkbox ? checkbox.checked : false;
    });

    // Get user info - always include Materio account if available
    let userType = formData.userIdentity || 'anonymous';
    let username = null;
    let githubUsername = null;
    let materioUser = null;

    // Read Materio user from localStorage - always attach if available
    try {
        const materioUserStr = localStorage.getItem('materio_user');
        if (materioUserStr) {
            materioUser = JSON.parse(materioUserStr);
            // Always set username from Materio account
            username = materioUser.username || materioUser.email || materioUser.id || null;

            // If user chose authenticated, or no identity field exists, use Materio account
            if (userType === 'authenticated' || !formData.userIdentity) {
                userType = 'authenticated';
            }
        }
    } catch (e) {
        console.warn('Could not parse materio_user:', e);
    }

    // Get GitHub username if selected
    if (userType === 'github') {
        githubUsername = formData.githubUsername || null;
    }

    // Show loading state
    submitBtn.disabled = true;
    const isFileUpload = currentFormType === 'contribution' && selectedFiles.length > 0;
    submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> <span>${isFileUpload ? 'Uploading...' : 'Submitting...'}</span>`;

    try {
        // Handle contribution form with file uploads
        if (currentFormType === 'contribution' && selectedFiles.length > 0 && formConfig.fileUpload?.uploadToGitHub) {
            // Use FormData for file upload
            const uploadFormData = new FormData();
            uploadFormData.append('semester', formData.semester);
            uploadFormData.append('subject', formData.subject);
            uploadFormData.append('category', formData.category);
            uploadFormData.append('userType', userType);

            if (username) {
                uploadFormData.append('username', username);
            }
            if (githubUsername) {
                uploadFormData.append('githubUsername', githubUsername);
            }

            // Append all files
            selectedFiles.forEach(file => {
                uploadFormData.append('files', file);
            });

            // Upload to contribution API (via features.js)
            const response = await fetch('/api/v2/features?action=contribute', {
                method: 'POST',
                body: uploadFormData
            });

            const result = await safeJsonParse(response);

            if (response.ok && result.success) {
                // Show success state
                document.getElementById('dynamicFormSuccessMessage').textContent =
                    getSuccessMessage(currentFormType);
                document.getElementById('dynamicFormSuccess').style.display = 'flex';
            } else {
                throw new Error(result.error || 'Upload failed');
            }
        } else if (currentFormType === 'bug-report') {
            // Bug reports go to the health API /report endpoint (MongoDB)
            // Fire-and-forget: show success immediately, submit in background
            const sessionId = sessionStorage.getItem('materio_session_id') || crypto.randomUUID();
            sessionStorage.setItem('materio_session_id', sessionId);

            const payload = JSON.stringify({
                title: formData.title,
                severity: formData.severity,
                affectedArea: formData.affectedArea,
                description: formData.description,
                stepsToReproduce: formData.stepsToReproduce || null,
                email: formData.email || null,
                sessionId: sessionId
            });

            // Show success immediately — don't make user wait
            document.getElementById('dynamicFormSuccessMessage').textContent =
                getSuccessMessage(currentFormType);
            document.getElementById('dynamicFormSuccess').style.display = 'flex';

            // Submit in background (fire-and-forget)
            fetch('/api/v2/health?action=report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: payload
            }).then(async resp => {
                if (!resp.ok) {
                    const err = await safeJsonParse(resp).catch(() => ({}));
                    console.warn('Bug report background submit issue:', err.error || resp.status);
                }
            }).catch(err => {
                console.warn('Bug report background submit failed (will retry on next visit):', err.message);
            });
        } else {
            // For non-file forms (feedback, beta-review), use JSON API
            const token = localStorage.getItem('materio_token');
            const userInfo = {
                type: userType,
                username: username,
                githubUsername: githubUsername
            };

            // Fire-and-forget: show success immediately, submit in background
            const payload = JSON.stringify({
                formType: currentFormType,
                user: userInfo,
                data: formData,
                confirmations: confirmationData
            });

            // Show success immediately — don't make user wait for DB write
            document.getElementById('dynamicFormSuccessMessage').textContent =
                getSuccessMessage(currentFormType);
            document.getElementById('dynamicFormSuccess').style.display = 'flex';

            // Submit in background (fire-and-forget)
            fetch('/api/v2/features?action=forms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: payload
            }).then(async resp => {
                if (!resp.ok) {
                    const err = await safeJsonParse(resp).catch(() => ({}));
                    // Form background submit issue
                }
            }).catch(err => {
                // Form background submit failed
            });
        }
    } catch (error) {
        // Form submission error
        document.getElementById('dynamicFormErrorMessage').textContent = error.message;
        document.getElementById('dynamicFormError').style.display = 'flex';
    }
}

/**
 * Get success message based on form type
 * @param {string} formType - Form type
 * @returns {string} - Success message
 */
function getSuccessMessage(formType) {
    const messages = {
        'contribution': 'Thank you for your contribution! Our team will review and add your materials soon.',
        'feedback': 'Thank you for your feedback! We really appreciate you taking the time to help us improve.',
        'beta-review': 'Thank you for your beta testing review! Your feedback helps us build a better product.',
        'bug-report': 'Bug report submitted! Our team will investigate this issue. Thank you for helping improve Materio!'
    };
    return messages[formType] || 'Your submission has been received. Thank you!';
}

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} - Formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ==========================================
// Form Activity Trigger System
// ==========================================

/**
 * Load form activity configuration
 */
async function loadFormActivityConfig() {
    try {
        const response = await fetch('/assets/data/formActivity.json');
        if (response.ok) {
            formActivityConfig = await response.json();

            // Wait a bit for other configs to load, then check triggers
            setTimeout(() => {
                checkFormActivityTriggers();
            }, 1000);
        }
    } catch (error) {
        // Form activity config not found or disabled
    }
}

/**
 * Check and process form activity triggers
 */
function checkFormActivityTriggers() {
    if (!formActivityConfig || !formActivityConfig.enabled) return;
    if (!formsConfig) {
        // Forms config not loaded yet, retry
        setTimeout(checkFormActivityTriggers, 500);
        return;
    }

    const settings = formActivityConfig.settings || {};
    const maxFormsPerSession = settings.maxFormsPerSession || 1;

    // Check if we've shown max forms this session
    if (formsShownThisSession >= maxFormsPerSession) return;

    // Check do not disturb
    if (settings.respectDoNotDisturb) {
        const dndKey = settings.doNotDisturbKey || 'materio_dnd_forms';
        if (localStorage.getItem(dndKey) === 'true') return;
    }

    // Get enabled activities sorted by priority
    const activities = (formActivityConfig.activities || [])
        .filter(a => a.enabled)
        .sort((a, b) => (a.priority || 99) - (b.priority || 99));

    for (const activity of activities) {
        if (shouldShowFormActivity(activity)) {
            triggerFormActivity(activity);
            break; // Only show one form
        }
    }
}

/**
 * Check if a form activity should be shown
 * @param {Object} activity - Activity configuration
 * @returns {boolean}
 */
function shouldShowFormActivity(activity) {
    // Check if form type exists
    if (!formsConfig.forms[activity.formType]) return false;

    // Check date range
    const now = new Date();
    if (activity.startDate && new Date(activity.startDate) > now) return false;
    if (activity.endDate && new Date(activity.endDate) < now) return false;

    // Check device/showOn
    if (activity.showOn && activity.showOn !== 'all') {
        const isMobile = window.innerWidth < 768;
        if (activity.showOn === 'mobile' && !isMobile) return false;
        if (activity.showOn === 'desktop' && isMobile) return false;
    }

    // Check frequency
    if (!checkFormFrequency(activity)) return false;

    // Check trigger conditions
    const conditions = activity.trigger?.conditions || {};

    // Check min visits
    if (conditions.minVisits) {
        const visits = parseInt(localStorage.getItem('materio_visit_count') || '1');
        if (visits < conditions.minVisits) return false;
    }

    // Check min days since first visit
    if (conditions.minDaysSinceFirstVisit) {
        const firstVisit = localStorage.getItem('materio_first_visit');
        if (firstVisit) {
            const daysSince = (now - new Date(firstVisit)) / (1000 * 60 * 60 * 24);
            if (daysSince < conditions.minDaysSinceFirstVisit) return false;
        }
    }

    // Check pages
    if (conditions.pages && conditions.pages.length > 0) {
        const currentPage = getCurrentPageType();
        if (!conditions.pages.includes(currentPage)) return false;
    }

    // Check exclude pages
    if (conditions.excludePages && conditions.excludePages.length > 0) {
        const currentPage = getCurrentPageType();
        if (conditions.excludePages.includes(currentPage)) return false;
    }

    // Check user type
    if (conditions.userType && conditions.userType !== 'any') {
        const isAuthenticated = !!localStorage.getItem('materio_user');
        if (conditions.userType === 'authenticated' && !isAuthenticated) return false;
        if (conditions.userType === 'anonymous' && isAuthenticated) return false;
    }

    return true;
}

/**
 * Check if form should be shown based on frequency
 * @param {Object} activity - Activity configuration
 * @returns {boolean}
 */
function checkFormFrequency(activity) {
    const storageKey = `form_activity_${activity.id}`;
    const lastShown = localStorage.getItem(storageKey);

    if (!lastShown && activity.frequency !== 'once') return true;
    if (!lastShown && activity.frequency === 'once') return true;
    if (lastShown && activity.frequency === 'once') return false;

    const lastShownDate = new Date(lastShown);
    const now = new Date();
    const hoursSinceShown = (now - lastShownDate) / (1000 * 60 * 60);

    switch (activity.frequency) {
        case 'everytime':
        case 'every-visit':
            return true;
        case 'every-12hr':
            return hoursSinceShown >= 12;
        case 'every-24hr':
        case 'daily':
            return hoursSinceShown >= 24;
        case 'every-7days':
        case 'weekly':
            return hoursSinceShown >= 168;
        case 'every-30days':
        case 'monthly':
            return hoursSinceShown >= 720;
        case 'custom':
            const customHours = activity.customFrequencyHours || 24;
            return hoursSinceShown >= customHours;
        default:
            return true;
    }
}

/**
 * Get current page type for condition matching
 * @returns {string}
 */
function getCurrentPageType() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/' || path === '/index.html') return 'home';
    if (path.includes('/account')) return 'account';
    if (path.includes('/blog') || path.includes('/posts')) return 'blog';
    if (path.includes('/about')) return 'about';
    if (path.includes('/changelog')) return 'changelog';
    return 'other';
}

/**
 * Trigger a form activity - show the form
 * @param {Object} activity - Activity configuration
 */
function triggerFormActivity(activity) {
    const delay = activity.trigger?.delay || 0;
    const settings = formActivityConfig.settings || {};
    const minTimeBetween = settings.minTimeBetweenForms || 0;

    // Check minimum time between forms
    if (lastFormShownTime && (Date.now() - lastFormShownTime) < minTimeBetween) {
        return;
    }

    setTimeout(() => {
        // Double check the modal isn't already open
        const modal = document.getElementById('dynamicFormModal');
        if (modal && modal.classList.contains('show')) return;

        // Don't show if promo modal is open
        const promoModal = document.getElementById('promoModal');
        if (promoModal && promoModal.style.display !== 'none' && promoModal.style.display !== '') return;

        // Show the form
        openDynamicForm(activity.formType);

        // Record that we showed this form
        const storageKey = `form_activity_${activity.id}`;
        localStorage.setItem(storageKey, new Date().toISOString());
        formsShownThisSession++;
        lastFormShownTime = Date.now();
    }, delay);
}

/**
 * Manually trigger a form activity by ID
 * @param {string} activityId - Activity ID from formActivity.json
 */
function triggerFormActivityById(activityId) {
    if (!formActivityConfig) return;
    const activity = formActivityConfig.activities.find(a => a.id === activityId);
    if (activity && formsConfig.forms[activity.formType]) {
        openDynamicForm(activity.formType);
    }
}

/**
 * Set do not disturb for forms
 * @param {boolean} enabled - Whether to enable DND
 */
function setFormDoNotDisturb(enabled) {
    const dndKey = formActivityConfig?.settings?.doNotDisturbKey || 'materio_dnd_forms';
    if (enabled) {
        localStorage.setItem(dndKey, 'true');
    } else {
        localStorage.removeItem(dndKey);
    }
}

// Track visits for condition checking
(function () {
    const visitCount = parseInt(localStorage.getItem('materio_visit_count') || '0') + 1;
    localStorage.setItem('materio_visit_count', visitCount.toString());

    if (!localStorage.getItem('materio_first_visit')) {
        localStorage.setItem('materio_first_visit', new Date().toISOString());
    }
})();

// Expose functions globally
window.openDynamicForm = openDynamicForm;
window.closeDynamicForm = closeDynamicForm;
window.resetDynamicForm = resetDynamicForm;
window.submitDynamicForm = submitDynamicForm;
window.removeSelectedFile = removeSelectedFile;
window.triggerFormActivityById = triggerFormActivityById;
window.setFormDoNotDisturb = setFormDoNotDisturb;
window.goToWizardPage = goToWizardPage;

