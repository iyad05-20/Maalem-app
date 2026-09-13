import { getBackendUrl } from "./artisanApi";

export interface ArtisanUser {
  id: string;
  email: string;
  fullName?: string;
  workshopName?: string;
  specialty?: string;
  city?: string;
  avatarUrl?: string;
}

const TOKEN_KEY = "artisan_session_token";
const USER_KEY = "artisan_user_profile";

class ArtisanAuthService {
  private getApiBase(): string {
    const root = getBackendUrl().replace(/\/api\/?$/, "");
    return `${root}/api/auth`;
  }

  /**
   * Connexion Maâlem via Supabase JWT
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: ArtisanUser; error?: string }> {
    try {
      const res = await fetch(`${this.getApiBase()}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      // Le backend local retourne { success, token, user } (pas data.session)
      if (data.success && data.token && data.user) {
        const artisanUser: ArtisanUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.email.split("@")[0],
          workshopName: data.user.workshopName || "Atelier d'Artisanat",
          specialty: data.user.specialty || "Artisanat Marocain",
          city: data.user.city || "Fès",
          avatarUrl: data.user.avatarUrl,
        };

        localStorage.setItem(TOKEN_KEY, data.token);
        localStorage.setItem(USER_KEY, JSON.stringify(artisanUser));

        return { success: true, user: artisanUser };
      }
      return { success: false, error: data.error || "Échec de la connexion." };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur réseau lors de la connexion." };
    }
  }

  /**
   * Inscription Maâlem
   */
  async signup(
    email: string,
    password: string,
    fullName: string,
    workshopName?: string,
    specialty?: string,
    city?: string
  ): Promise<{ success: boolean; user?: ArtisanUser; error?: string }> {
    try {
      const res = await fetch(`${this.getApiBase()}/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          fullName,
          role: "artisan",
          metadata: { workshopName, specialty, city },
        }),
      });
      const data = await res.json();

      // Le backend local retourne { success, token, user }
      if (data.success) {
        if (data.token && data.user) {
          const artisanUser: ArtisanUser = {
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.fullName || fullName || data.user.email.split("@")[0],
            workshopName: workshopName || "Atelier d'Artisanat",
            specialty: specialty || "Artisanat Marocain",
            city: city || "Fès",
          };
          localStorage.setItem(TOKEN_KEY, data.token);
          localStorage.setItem(USER_KEY, JSON.stringify(artisanUser));
          return { success: true, user: artisanUser };
        }
        return { success: true, error: "Compte artisan créé avec succès ! Connectez-vous." };
      }
      return { success: false, error: data.error || "Échec de l'inscription." };
    } catch (err: any) {
      return { success: false, error: err.message || "Erreur réseau lors de l'inscription." };
    }
  }

  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${this.getApiBase()}/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
      }
    } catch (err) {
      console.warn("[ARTISAN-AUTH] Logout network warning:", err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }

  /**
   * Récupérer le jeton stocké
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * En-têtes d'autorisation Bearer Token
   */
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Récupérer le profil utilisateur stocké localement
   */
  getStoredUser(): ArtisanUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  /**
   * Vérification de session active auprès de Supabase
   */
  async checkSession(): Promise<ArtisanUser | null> {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${this.getApiBase()}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      // Le backend local retourne { success, user } sans 'profile' séparé
      if (data.success && data.user) {
        const artisanUser: ArtisanUser = {
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.fullName || data.user.email.split("@")[0],
          workshopName: data.user.workshopName || "Atelier d'Artisanat",
          specialty: data.user.specialty || "Artisanat Marocain",
          city: data.user.city || "Fès",
          avatarUrl: data.user.avatarUrl,
        };
        localStorage.setItem(USER_KEY, JSON.stringify(artisanUser));
        return artisanUser;
      }

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        return null;
      }
    } catch (err) {
      console.warn("[ARTISAN-AUTH] Network error during session check, keeping cached user:", err);
      return this.getStoredUser();
    }

    return this.getStoredUser();
  }
}

export const artisanAuthService = new ArtisanAuthService();
