import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
    accessToken: string | null;
    user: {id: string; email: string; role: string; fullName: string} | null;
    setAuth: (token: string, userData: any) => void;
    logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>(
    persist(
        (set, get) => ({
            accessToken: null,
            user: null,
            setAuth: (token, userData) => {
                // Validate that userData.id is a string (UUID format)
                if (userData && userData.id) {
                    if (typeof userData.id !== 'string') {
                        console.warn('User ID is not a string, converting:', userData.id);
                        userData.id = String(userData.id);
                    }
                }
                set({ accessToken: token, user: userData });
            },
            logout: async () => {
                // Record logout activity
                try {
                    const state = get();
                    if (state.user?.id && state.accessToken) {
                        console.log('Recording logout for user:', state.user.id);
                        const response = await fetch('http://localhost:5000/api/admin/activity-log/record-logout', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${state.accessToken}`
                            },
                            body: JSON.stringify({
                                userId: state.user.id
                            })
                        });
                        
                        if (!response.ok) {
                            console.error('Failed to record logout activity:', response.statusText);
                        } else {
                            console.log('Logout activity recorded successfully');
                        }
                    }
                } catch (err) {
                    console.error('Error during logout activity recording:', err);
                }

                // Clear userRole from localStorage
                if (typeof window !== 'undefined') {
                    localStorage.removeItem('userRole');
                }
                set({ accessToken: null, user: null });
            },
        }),
        {
            name: 'auth-store',
            storage: typeof window !== 'undefined' ? localStorage : undefined,
        }
    )
);