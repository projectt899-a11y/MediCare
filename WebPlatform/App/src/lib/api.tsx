import axios from 'axios';
import { useAuthStore } from '../store/authStore'; 

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  withCredentials: true, // for cookies
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(null);
  });
  failedQueue = [];
};

// Response interceptor للـ refresh
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // لو فيه refresh جاري → انتظر وأعد المحاولة
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => api(originalRequest))
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('Attempting refresh with credentials');
        const { data } = await api.post('/auth/refresh', {}, { withCredentials: true });
        const newAccessToken = data.accessToken;
        console.log('New access token received:', newAccessToken.substring(0, 20) + '...');
        useAuthStore.getState().setAuth(newAccessToken, useAuthStore.getState().user);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        processQueue(null);
        return api(originalRequest); // أعد الطلب الأصلي بالتوكن الجديد
      } catch (refreshError) {
        console.error('Refresh failed:', refreshError);
        processQueue(refreshError);
        useAuthStore.getState().logout();
        window.location.href = '/login'; // أو navigate('/login')
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Request interceptor (يضيف التوكن لكل طلب)
api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  const user = useAuthStore.getState().user;

  const isAuthRequest = config.url?.includes('/auth/') || config.url?.includes('/refresh');
  // Public routes that don't need authentication
  const isPublicRoute = config.url?.includes('/doctor/search');

  if (token && !isAuthRequest && !isPublicRoute) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if(!token && !isAuthRequest && !isPublicRoute){
    console.warn('[API Request] No token found for protected request:', config.url);
  }

  return config;
});

export default api;