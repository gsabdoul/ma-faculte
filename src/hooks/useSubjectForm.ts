import { useState } from 'react';
import { supabase } from '../supabase';
import { useUser } from './useUser';
import type { SujetFromDB, SubjectInfo, Module, University } from '../types';

// État initial pour un nouveau sujet
const initialSubjectState: SubjectInfo = {
    id: '',
    moduleId: '',
    moduleName: '',
    universityId: '',
    universityName: '',
    year: '',
    session: 'Normale',
    correction: '',
};

// Le hook personnalisé
export function useSubjectForm(
    setAllSubjects: React.Dispatch<React.SetStateAction<SubjectInfo[]>>,
    dependencies: { modules: Module[]; universities: University[] }
) {
    const { user } = useUser();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSubject, setActiveSubject] = useState<SubjectInfo>(initialSubjectState);
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof SubjectInfo, string>>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { modules, universities } = dependencies;

    // Ouvre la modale pour ajouter ou modifier un sujet
    const openModal = (subjectToEdit?: SubjectInfo) => {
        setFormErrors({});
        if (subjectToEdit) {
            // Si on modifie, on pré-remplit le formulaire
            setActiveSubject({
                ...subjectToEdit,
                year: subjectToEdit.year ?? '',
                session: subjectToEdit.session ?? 'Normale',
                correction: subjectToEdit.correction ?? '',
            });
        } else {
            // Sinon, on utilise l'état initial pour un nouveau sujet
            setActiveSubject(initialSubjectState);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setActiveSubject(initialSubjectState); // Réinitialiser le formulaire à la fermeture
    };

    // Valide les données du formulaire
    const validateForm = () => {
        const errors: Partial<Record<keyof SubjectInfo, string>> = {};
        if (!activeSubject.moduleId) {
            errors.moduleId = 'Le module est requis.';
        }
        if (!activeSubject.universityId) {
            errors.universityId = "L'université est requise.";
        }
        if (activeSubject.year && (isNaN(Number(activeSubject.year)) || Number(activeSubject.year) < 1900 || Number(activeSubject.year) > 2100)) {
            errors.year = "L'année doit être valide (ex: 2023).";
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Gère la soumission du formulaire
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm() || !user) return;

        setIsSubmitting(true);

        const subjectData = {
            module_id: activeSubject.moduleId,
            universite_id: activeSubject.universityId,
            annee: activeSubject.year ? Number(activeSubject.year) : null,
            session: activeSubject.session || 'Normale',
            correction: activeSubject.correction || null,
            created_by: user.id,
        };

        try {
            let result: SujetFromDB | null;
            if (activeSubject.id) {
                // Mise à jour d'un sujet existant
                const { data, error } = await supabase
                    .from('sujets')
                    .update(subjectData)
                    .eq('id', activeSubject.id)
                    .select<string, SujetFromDB>('id, module_id, universite_id, annee, session, correction, created_by (id, nom, prenom)')
                    .single();
                if (error) throw error;
                result = data;
                if (result) {
                    // Mettre à jour le sujet dans la liste globale
                    setAllSubjects(prev => prev.map(s => (s.id === result!.id ? sujetToSubjectInfo(result!) : s)));
                }
            } else {
                // Création d'un nouveau sujet
                const { data, error } = await supabase
                    .from('sujets')
                    .insert(subjectData)
                    .select<string, SujetFromDB>('id, module_id, universite_id, annee, session, correction, created_by (id, nom, prenom)')
                    .single();
                if (error) throw error;
                result = data;
                if (result) {
                    // Ajouter le nouveau sujet à la liste globale
                    setAllSubjects(prev => [...prev, sujetToSubjectInfo(result!)]);
                }
            }
            closeModal();
        } catch (error: any) {
            console.error("Erreur lors de la soumission du sujet:", error);
            setFormErrors({ ...formErrors, id: error.message }); // Affiche une erreur générale
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fonction utilitaire pour transformer les données de Supabase
    const sujetToSubjectInfo = (s: SujetFromDB): SubjectInfo => {
        const module = modules.find(m => m.id === s.module_id);
        const uni = universities.find(u => u.id === s.universite_id);
        const creatorName = s.created_by ? `${s.created_by.prenom || ''} ${s.created_by.nom || ''}`.trim() : 'Inconnu';

        return {
            id: s.id,
            moduleId: s.module_id,
            moduleName: module?.name || '',
            universityId: s.universite_id,
            universityName: uni?.name || '',
            correction: s.correction ?? null,
            year: s.annee ?? null,
            session: s.session ?? 'Normale',
            creatorId: s.created_by?.id,
            creatorName: creatorName,
        };
    };

    return {
        isModalOpen,
        activeSubject,
        setActiveSubject,
        formErrors,
        isSubmitting,
        handleSubmit,
        openModal,
        closeModal,
    };
}
