// API Client for making HTTP requests
class ApiClient {
    constructor(baseURL = '/api') {
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

    // Get authentication headers
    getHeaders(customHeaders = {}) {
        const headers = { ...this.defaultHeaders, ...customHeaders };
        
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        return headers;
    }

    // Make HTTP request
    async request(method, url, data = null, options = {}) {
        try {
            const config = {
                method: method.toUpperCase(),
                headers: this.getHeaders(options.headers),
                ...options
            };

            // Add body for non-GET requests
            if (data && method.toUpperCase() !== 'GET') {
                if (data instanceof FormData) {
                    // Don't set Content-Type for FormData, let browser set it
                    delete config.headers['Content-Type'];
                    config.body = data;
                } else {
                    config.body = JSON.stringify(data);
                }
            }

            // Add query parameters for GET requests
            if (data && method.toUpperCase() === 'GET') {
                const params = new URLSearchParams(data);
                url += `?${params.toString()}`;
            }

            const response = await fetch(`${this.baseURL}${url}`, config);
            
            // Handle different response types
            let responseData;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                responseData = await response.json();
            } else {
                responseData = await response.text();
            }

            if (!response.ok) {
                throw new Error(responseData.error || responseData.message || `HTTP ${response.status}`);
            }

            return responseData;
        } catch (error) {
            console.error(`API request failed: ${method} ${url}`, error);
            throw error;
        }
    }

    // Convenience methods
    async get(url, params = null, options = {}) {
        return this.request('GET', url, params, options);
    }

    async post(url, data = null, options = {}) {
        return this.request('POST', url, data, options);
    }

    async put(url, data = null, options = {}) {
        return this.request('PUT', url, data, options);
    }

    async patch(url, data = null, options = {}) {
        return this.request('PATCH', url, data, options);
    }

    async delete(url, options = {}) {
        return this.request('DELETE', url, null, options);
    }

    // Upload file with progress tracking
    uploadFile(url, file, onProgress = null) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);

            const xhr = new XMLHttpRequest();

            // Track upload progress
            if (onProgress) {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = (event.loaded / event.total) * 100;
                        onProgress(percentComplete);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (error) {
                        resolve(xhr.responseText);
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${this.baseURL}${url}`);
            
            // Add auth header if available
            if (this.authToken) {
                xhr.setRequestHeader('Authorization', `Bearer ${this.authToken}`);
            }
            
            xhr.send(formData);
        });
    }
}