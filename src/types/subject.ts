export interface Subject {
    id: string;
    module_id: string;
    universite_id: string;
    faculte_id: string | null;
    niveau_id: string | null;
    annee: number | null;
    session: 'Normale' | 'Rattrapage';
    correction: string | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;

    // Relations (populated by joins)
    modules?: {
        id: string;
        nom: string;
        icone_url?: string;
    };
    universites?: {
        id: string;
        nom: string;
    };
    facultes?: {
        id: string;
        nom: string;
    };
    niveaux?: {
        id: string;
        nom: string;
    };
}
