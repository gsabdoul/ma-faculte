/**
 * Représente la structure d'un sujet tel que retourné par la base de données,
 * incluant les informations du créateur.
 */
export interface SujetFromDB {
    id: string;
    module_id: string;
    universite_id: string;
    annee: number | null;
    session: 'Normale' | 'Rattrapage';
    correction: string | null;
    created_by: { id: string; nom: string; prenom: string } | null;
}

/**
 * Représente la structure des données d'un sujet utilisée dans les formulaires
 * et les affichages de l'interface utilisateur.
 */
export interface SubjectInfo {
    id: string;
    moduleId: string;
    moduleName: string;
    universityId: string;
    universityName: string;
    year?: number | string | null;
    session?: string;
    correction?: string | null;
    creatorId?: string;
    creatorName?: string;
}

export type Module = { id: string; name: string };
export type University = { id: string; name: string };