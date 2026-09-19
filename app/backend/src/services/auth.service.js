import { supabase } from '../db/supabase.client.js';

/**
 * Inscription d'un nouvel utilisateur via Supabase Auth.
 * Le mot de passe est haché et stocké de manière sécurisée dans la table système auth.users
 * (colonne encrypted_password). Le trigger Postgres handle_new_user_signup crée automatiquement
 * la ligne correspondante dans public.profiles et public.user_profiles.
 */
export async function signUpUser(email, password, fullName) {
  if (!email || !password) {
    throw new Error('L\'adresse email et le mot de passe sont obligatoires.');
  }
  if (password.length < 6) {
    throw new Error('Le mot de passe doit contenir au moins 6 caractères.');
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName ? fullName.trim() : cleanEmail.split('@')[0];

  let user = null;
  let session = null;

  // 1. Tenter la création directe via admin.createUser (Auto-confirmation instantanée de l'email)
  try {
    const { data: adminData, error: adminErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: cleanName }
    });

    if (!adminErr && adminData?.user) {
      user = adminData.user;
      console.log(`[AUTH-SERVICE] 🔑 User created & auto-confirmed via Supabase Admin API: ${cleanEmail}`);
    }
  } catch (err) {
    console.log('[AUTH-SERVICE] Admin API fallback to standard signUp');
  }

  // 2. Fallback vers auth.signUp standard si la clé service_role n'est pas utilisée
  if (!user) {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: { full_name: cleanName }
      }
    });

    if (error) {
      console.error('[AUTH-SERVICE] Error in signUp:', error.message);
      throw new Error(error.message);
    }
    user = data.user;
    session = data.session;
  }

  // 3. Auto-connexion immédiate après inscription pour obtenir la session et le jeton JWT
  if (!session && user) {
    try {
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });
      if (loginData?.session) {
        session = loginData.session;
      }
    } catch (loginErr) {
      console.warn('[AUTH-SERVICE] Auto-login post signup pending email verification:', loginErr.message);
    }
  }

  return {
    user,
    session
  };
}

/**
 * Connexion d'un utilisateur existant via Supabase Auth (vérification hash mot de passe dans auth.users).
 */
export async function signInUser(email, password) {
  if (!email || !password) {
    throw new Error('L\'adresse email et le mot de passe sont obligatoires.');
  }

  const cleanEmail = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (error) {
    console.error('[AUTH-SERVICE] Error in signIn:', error.message);
    if (error.message.includes('Email not confirmed')) {
      throw new Error('Votre email n\'est pas encore confirmé. Veuillez vérifier vos emails ou contacter l\'administrateur.');
    }
    throw new Error('Email ou mot de passe incorrect.');
  }

  // Récupération du profil public associé
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    user: data.user,
    profile: profile || null,
    session: data.session
  };
}

/**
 * Déconnexion d'un utilisateur.
 */
export async function signOutUser(accessToken) {
  try {
    if (accessToken) {
      await supabase.auth.signOut(accessToken);
    }
  } catch (err) {
    console.warn('[AUTH-SERVICE] Warning during signOut:', err.message);
  }
  return { success: true };
}

/**
 * Vérification d'un jeton JWT et récupération de l'utilisateur.
 */
export async function getUserFromToken(accessToken) {
  if (!accessToken) return null;

  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return {
    user: data.user,
    profile: profile || null
  };
}
