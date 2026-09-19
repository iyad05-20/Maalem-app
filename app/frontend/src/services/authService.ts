import { API_BASE } from './apiConfig';

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
}

const TOKEN_KEY = 'maalem_session_token';
const USER_KEY  = 'maalem_user_profile';

class AuthService {
  /**
   * Connexion utilisateur
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (data.success && data.session && data.user) {
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.profile?.full_name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          avatarUrl: data.profile?.avatar_url || data.user.user_metadata?.avatar_url
        };

        localStorage.setItem(TOKEN_KEY, data.session.access_token);
        localStorage.setItem(USER_KEY, JSON.stringify(userProfile));

        return { success: true, user: userProfile };
      }
      return { success: false, error: data.error || 'Échec de la connexion.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur réseau lors de la connexion.' };
    }
  }

  /**
   * Inscription utilisateur
   */
  async signup(email: string, password: string, fullName: string): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      });
      const data = await res.json();

      if (data.success) {
        if (data.session && data.user) {
          const userProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email,
            fullName: fullName || data.user.email.split('@')[0],
          };
          localStorage.setItem(TOKEN_KEY, data.session.access_token);
          localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
          return { success: true, user: userProfile };
        }
        return { success: true, error: 'Compte créé avec succès ! Connectez-vous.' };
      }
      return { success: false, error: data.error || 'Échec de l\'inscription.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur réseau lors de l\'inscription.' };
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (err) {
      console.warn('[AUTH-FE] Logout network error:', err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Récupération du jeton en cache local
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * En-têtes d'authentification Bearer JWT
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  /**
   * Récupération de l'utilisateur en cache local
   */
  getStoredUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Vérification de session active auprès du backend
   */
  async checkSession(): Promise<UserProfile | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success && data.user) {
        const userProfile: UserProfile = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.profile?.full_name || data.user.user_metadata?.full_name || data.user.email.split('@')[0],
          avatarUrl: data.profile?.avatar_url
        };
        localStorage.setItem(USER_KEY, JSON.stringify(userProfile));
        return userProfile;
      }
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
    } catch (err) {
      console.warn('[AUTH-FE] Network error during session check, keeping cached user:', err);
      return this.getStoredUser();
    }

    return this.getStoredUser();
  }
}

export const authService = new AuthService();
