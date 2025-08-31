// UI Manager for handling common UI operations
class UIManager {
    constructor() {
        this.loadingSpinner = document.getElementById('loading-spinner');
    }
    
    // Show loading spinner
    showLoading(message = 'Loading...') {
        if (this.loadingSpinner) {
            const messageElement = this.loadingSpinner.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            this.loadingSpinner.style.display = 'flex';
        }
    }
    
    // Hide loading spinner
    hideLoading() {
        if (this.loadingSpinner) {
            this.loadingSpinner.style.display = 'none';
        }
    }
    
    // Show/hide element
    toggleElement(element, show = null) {
        if (!element) return;
        
        if (show === null) {
            element.classList.toggle('hidden');
        } else if (show) {
            element.classList.remove('hidden');
        } else {
            element.classList.add('hidden');
        }
    }
    
    // Enable/disable form
    toggleForm(form, enabled = true) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea, button');
        inputs.forEach(input => {
            input.disabled = !enabled;
        });
        
        if (enabled) {
            form.classList.remove('loading');
        } else {
            form.classList.add('loading');
        }
    }
    
    // Clear form
    clearForm(form) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Clear error messages
        const errors = form.querySelectorAll('.form-error');
        errors.forEach(error => error.remove());
    }
    
    // Show form error
    showFormError(input, message) {
        if (!input) return;
        
        // Remove existing error
        const existingError = input.parentNode.querySelector('.form-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error class to input
        input.classList.add('error');
        
        // Create and add error message
        const errorElement = document.createElement('div');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        input.parentNode.appendChild(errorElement);
    }
    
    // Clear form error
    clearFormError(input) {
        if (!input) return;
        
        input.classList.remove('error');
        const error = input.parentNode.querySelector('.form-error');
        if (error) {
            error.remove();
        }
    }
    
    // Animate element
    animate(element, animation, duration = 300) {
        if (!element) return Promise.resolve();
        
        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ease-in-out`;
            
            const handleAnimationEnd = () => {
                element.style.animation = '';
                element.removeEventListener('animationend', handleAnimationEnd);
                resolve();
            };
            
            element.addEventListener('animationend', handleAnimationEnd);
        });
    }
    
    // Smooth scroll to element
    scrollToElement(element, offset = 0) {
        if (!element) return;
        
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
    
    // Create loading skeleton
    createSkeleton(container, type = 'text', count = 3) {
        if (!container) return;
        
        container.innerHTML = '';
        
        for (let i = 0; i < count; i++) {
            const skeleton = document.createElement('div');
            skeleton.className = `skeleton skeleton-${type}`;
            container.appendChild(skeleton);
        }
    }
    
    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Copy text to clipboard
    async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                const result = document.execCommand('copy');
                document.body.removeChild(textArea);
                return result;
            }
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
            return false;
        }
    }
    
    // Create modal
    createModal(content, options = {}) {
        const modalContainer = document.getElementById('modal-container');
        if (!modalContainer) return null;
        
        const modal = document.createElement('div');
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
            <div class="modal ${options.size || ''}">
                ${options.showCloseButton !== false ? `
                    <button class="btn-close" onclick="closeModal()">
                        <i data-lucide="x"></i>
                    </button>
                ` : ''}
                ${content}
            </div>
        `;
        
        modalContainer.appendChild(modal);
        
        // Initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // Close on backdrop click
        if (options.closeOnBackdrop !== false) {
            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    this.closeModal();
                }
            });
        }
        
        // Close on escape key
        if (options.closeOnEscape !== false) {
            const handleEscape = (event) => {
                if (event.key === 'Escape') {
                    this.closeModal();
                    document.removeEventListener('keydown', handleEscape);
                }
            };
            document.addEventListener('keydown', handleEscape);
        }
        
        return modal;
    }
    
    // Close modal
    closeModal() {
        const modalContainer = document.getElementById('modal-container');
        if (modalContainer) {
            modalContainer.innerHTML = '';
        }
    }
    
    // Create confirmation dialog
    showConfirmDialog(message, options = {}) {
        return new Promise(resolve => {
            const content = `
                <div class="modal-header">
                    <h3>${options.title || 'Confirm Action'}</h3>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                    <div class="form-actions">
                        <button class="btn btn-secondary" onclick="SkillSwap.ui.resolveConfirmDialog(false)">
                            ${options.cancelText || 'Cancel'}
                        </button>
                        <button class="btn ${options.confirmClass || 'btn-primary'}" onclick="SkillSwap.ui.resolveConfirmDialog(true)">
                            ${options.confirmText || 'Confirm'}
                        </button>
                    </div>
                </div>
            `;
            
            this.confirmResolve = resolve;
            this.createModal(content, { closeOnBackdrop: false, closeOnEscape: true });
        });
    }
    
    // Resolve confirmation dialog
    resolveConfirmDialog(result) {
        if (this.confirmResolve) {
            this.confirmResolve(result);
            this.confirmResolve = null;
        }
        this.closeModal();
    }
    
    // Show image preview
    showImagePreview(imageSrc, alt = '') {
        const content = `
            <div class="modal-body text-center p-0">
                <img src="${imageSrc}" alt="${alt}" style="max-width: 100%; max-height: 80vh; object-fit: contain;">
            </div>
        `;
        
        this.createModal(content, { size: 'modal-lg' });
    }
    
    // Lazy load images
    setupLazyLoading() {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        imageObserver.unobserve(img);
                    }
                });
            });
            
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        } else {
            // Fallback for browsers without IntersectionObserver
            document.querySelectorAll('img[data-src]').forEach(img => {
                img.src = img.dataset.src;
                img.classList.remove('lazy');
            });
        }
    }
    
    // Update page metadata
    updatePageMeta(title, description = '', keywords = '') {
        // Update title
        document.title = title;
        
        // Update meta description
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.setAttribute('name', 'description');
            document.head.appendChild(metaDescription);
        }
        metaDescription.setAttribute('content', description);
        
        // Update meta keywords
        let metaKeywords = document.querySelector('meta[name="keywords"]');
        if (!metaKeywords && keywords) {
            metaKeywords = document.createElement('meta');
            metaKeywords.setAttribute('name', 'keywords');
            document.head.appendChild(metaKeywords);
        }
        if (metaKeywords && keywords) {
            metaKeywords.setAttribute('content', keywords);
        }
    }
    
    // Setup form validation
    setupFormValidation(form) {
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Real-time validation
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            // Clear errors on input
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    this.clearFormError(input);
                }
            });
        });
        
        // Form submission validation
        form.addEventListener('submit', (event) => {
            let isValid = true;
            
            inputs.forEach(input => {
                if (!this.validateField(input)) {
                    isValid = false;
                }
            });
            
            if (!isValid) {
                event.preventDefault();
            }
        });
    }
    
    // Validate individual field
    validateField(input) {
        if (!input) return true;
        
        let isValid = true;
        let message = '';
        
        // Required validation
        if (input.hasAttribute('required') && !input.value.trim()) {
            isValid = false;
            message = `${this.getFieldLabel(input)} is required`;
        }
        
        // Email validation
        if (input.type === 'email' && input.value && !window.SkillSwap.utils.isValidEmail(input.value)) {
            isValid = false;
            message = 'Please enter a valid email address';
        }
        
        // Password validation
        if (input.type === 'password' && input.value) {
            const minLength = input.getAttribute('minlength') || 8;
            if (input.value.length < minLength) {
                isValid = false;
                message = `Password must be at least ${minLength} characters long`;
            }
        }
        
        // Show or clear error
        if (!isValid) {
            this.showFormError(input, message);
        } else {
            this.clearFormError(input);
        }
        
        return isValid;
    }
    
    // Get field label for validation messages
    getFieldLabel(input) {
        const label = input.closest('.form-group')?.querySelector('label');
        return label ? label.textContent.replace('*', '').trim() : 'Field';
    }
}