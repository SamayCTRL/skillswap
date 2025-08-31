// API Client for handling HTTP requests
class ApiClient {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.authToken = null;
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }
    
    // Set authentication token
    setAuthToken(token) {
        this.authToken = token;
    }
    
    // Get headers with auth token
    getHeaders(customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }
    
    // Handle HTTP responses
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            data = await response.text();
        }
        
        if (!response.ok) {
            const error = new Error(data.error || data.message || `HTTP ${response.status}`);
            error.status = response.status;
            error.data = data;
            throw error;
        }
        
        return data;
    }
    
    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(options.headers),
            ...options
        };
        
        // Don't stringify FormData
        if (config.body && !(config.body instanceof FormData)) {
            config.body = JSON.stringify(config.body);
        }
        
        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }
    
    // GET request
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        
        return this.request(url, {
            method: 'GET'
        });
    }
    
    // POST request
    async post(endpoint, body = null, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body,
            ...options
        });
    }
    
    // PUT request
    async put(endpoint, body = null, options = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body,
            ...options
        });
    }
    
    // PATCH request
    async patch(endpoint, body = null, options = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body,
            ...options
        });
    }
    
    // DELETE request
    async delete(endpoint, options = {}) {
        return this.request(endpoint, {
            method: 'DELETE',
            ...options
        });
    }
    
    // Upload file
    async upload(endpoint, file, progressCallback = null) {
        const formData = new FormData();
        formData.append('file', file);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Set up progress tracking
            if (progressCallback) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        progressCallback(percentComplete);
                    }
                });
            }
            
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve(xhr.responseText);
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.error || error.message || `HTTP ${xhr.status}`));
                    } catch (e) {
                        reject(new Error(`HTTP ${xhr.status}`));
                    }
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Network error'));
            });
            
            xhr.open('POST', `${this.baseURL}${endpoint}`);
            
            // Set auth header
            if (this.authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
            }
            
            xhr.send(formData);\n        });\n    }\n}