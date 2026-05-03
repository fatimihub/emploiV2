import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:8002/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true,
  
});

// Add request interceptor to add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle network errors
        if (!error.response) {
            console.error('Network Error:', error.message);
            return Promise.reject({ message: 'Network Error. Please check your connection.' });
        }

        const { status, data } = error.response;

        // Handle 401 Unauthorized
        if (status === 401) {
            console.log(` 401 Unauthorized for: ${error.config.method?.toUpperCase()} ${error.config.url}`);
            // If it's the login request itself failing, don't clear token or redirect
            // This allows the Login component to show "Invalid credentials"
            if (error.config.url?.endsWith('/login')) {
                return Promise.reject({
                    message: data?.message || 'Invalid email or password',
                    status: 401,
                    response: error.response
                });
            }

            // Clear auth data for other 401s (expired session)
            localStorage.removeItem('token');
            localStorage.removeItem('administrator');
            
            // Only redirect if not already on login page
            if (!window.location.hash.includes('#/login')) {
                window.location.hash = '#/login';
            }
            
            return Promise.reject({ 
                message: 'Session expired. Please log in again.',
                status: 401,
                response: error.response
            });
        }

        // Handle error responses
        const errorMessage = data?.errors || data?.message || data?.error || 'An error occurred. Please try again.';
        
        // Return a consistent error object structure
        return Promise.reject({
            message: errorMessage,
            errors: errorMessage,
            status,
            response: error.response
        });
    }
);

export default api;