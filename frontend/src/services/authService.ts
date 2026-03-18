import type { AuthResponse, User } from '../types';

const AUTH_KEY = 'coolmate_auth_v1';

const mockUser: User = {
  id: 'u-1001',
  name: 'Khách Hàng Mới',
  email: 'user@example.com',
};

const persist = (data: AuthResponse | null) => {
  if (data) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(data));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
};

export const authService = {
  getSession(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    // Mock validation
    if (!email || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin');
    }
    const response: AuthResponse = {
      token: 'mock-token-' + Date.now(),
      user: { ...mockUser, email, name: mockUser.name },
    };
    persist(response);
    return response;
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    if (!name || !email || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin');
    }
    const response: AuthResponse = {
      token: 'mock-token-' + Date.now(),
      user: { id: 'u-' + Date.now(), name, email },
    };
    persist(response);
    return response;
  },

  async forgot(email: string): Promise<void> {
    if (!email) throw new Error('Vui lòng nhập email');
    await new Promise(res => setTimeout(res, 400));
  },

  async reset(newPassword: string): Promise<void> {
    if (!newPassword) throw new Error('Vui lòng nhập mật khẩu mới');
    await new Promise(res => setTimeout(res, 400));
  },

  logout() {
    persist(null);
  },
};
