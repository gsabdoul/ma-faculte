import { createClient } from '@supabase/supabase-js'

// Récupère les variables d'environnement pour l'URL et la clé Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Crée et exporte une instance unique du client Supabase
// que nous pourrons utiliser partout dans notre application.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)