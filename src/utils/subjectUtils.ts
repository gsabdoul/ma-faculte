
export function getSubjectTitle(subject: {
    modules?: { nom: string };
    universites?: { nom: string };
    annee?: number | null;
    session?: string;
}): string {
    const parts: string[] = [];

    if (subject.modules?.nom) {
        parts.push(subject.modules.nom);
    }

    if (subject.universites?.nom) {
        parts.push(subject.universites.nom);
    }

    if (subject.annee) {
        parts.push(subject.annee.toString());
    }

    if (subject.session) {
        parts.push(subject.session);
    }

    return parts.length > 0 ? parts.join(' - ') : 'Sujet sans titre';
}

/**
 * Generates a short title for display in compact spaces
 * Format: "Module - Année"
 */
export function getSubjectShortTitle(subject: {
    modules?: { nom: string };
    annee?: number | null;
}): string {
    const parts: string[] = [];

    if (subject.modules?.nom) {
        parts.push(subject.modules.nom);
    }

    if (subject.annee) {
        parts.push(subject.annee.toString());
    }

    return parts.length > 0 ? parts.join(' - ') : 'Sujet';
}
