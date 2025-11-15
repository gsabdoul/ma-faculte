import { useState, useMemo, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    PencilIcon,
    TrashIcon,
    DocumentPlusIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import { supabase } from '../../supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Modal } from '../../components/Modal';
import { SearchableSelect } from '../../components/SearchableSelect';

type ModuleId = string;

// Types for fetched data
// Simplified frontend shapes: we map DB fields to { id, name }
type Module = { id: string; name: string };
type University = { id: string; name: string };

// Aplatir/simplifier: we'll fetch sujets, modules and universites from Supabase

interface SubjectInfo {
    id: string;
    title: string;
    fileSize: string;
    pdfUrl: string;
    moduleId: string;
    moduleName: string;
    universityId: string;
    universityName: string;
    correction?: string | null;
    year?: number | null;
    creatorId?: number;
    creatorName?: string;
}

const emptySubject = {
    id: null as string | null,
    title: '',
    moduleId: '',
    moduleName: '',
    universityId: '',
    universityName: '',
    file: null as File | null,
    correction: '' as string,
    year: '' as string | number | ''
};

export function ManageSubjectsPage() {
    // États pour la recherche, la pagination et les données
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [allSubjects, setAllSubjects] = useState<SubjectInfo[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);

    // Load modules, universites and sujets from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [modsRes, unisRes, sujetsRes] = await Promise.all([
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                    supabase.from('sujets').select('id, titre, fichier_url, module_id, universite_id, annee, correction'),
                ]);

                if (cancelled) return;

                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;
                if (sujetsRes.error) throw sujetsRes.error;

                const mods: Module[] = (modsRes.data || []).map((m: any) => ({ id: m.id, name: m.nom }));
                const unis: University[] = (unisRes.data || []).map((u: any) => ({ id: u.id, name: u.nom }));

                // helper maps for name lookup
                const modById = Object.fromEntries(mods.map(m => [m.id, m]));
                const uniById = Object.fromEntries(unis.map(u => [u.id, u]));

                const sujets = (sujetsRes.data || []).map((s: any) => {
                    const module = modById[s.module_id];
                    const uni = uniById[s.universite_id];
                    const info: SubjectInfo = {
                        id: s.id,
                        title: s.titre || 'Sans titre',
                        fileSize: 'N/A',
                        pdfUrl: s.fichier_url || '#',
                        moduleId: s.module_id,
                        moduleName: module?.name || '',
                        universityId: s.universite_id,
                        universityName: uni?.name || '',
                        correction: s.correction ?? null,
                        year: s.annee ?? null,
                    };
                    return info;
                });

                setModules(mods);
                setUniversities(unis);
                setAllSubjects(sujets);
            } catch (_err) {
                // intentionally silent; UI could surface this in future
            }
        };

        load();
        return () => { cancelled = true; };
    }, []);
    const [currentPage, setCurrentPage] = useState(1);
    const SUBJECTS_PER_PAGE = 10;

    // États pour la modale et le formulaire d'ajout
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeSubject, setActiveSubject] = useState(emptySubject);

    // État pour la modale de suppression
    const [subjectToDelete, setSubjectToDelete] = useState<SubjectInfo | null>(null);

    const universitiesByModule: Record<string, University[]> = useMemo(() => {
        // In the current schema universites are not directly linked to modules,
        // so we expose the full list for every module to keep the UI working.
        const map: Record<string, University[]> = {};
        modules.forEach(m => { map[m.id] = universities; });
        return map;
    }, [modules, universities]);

    const filteredSubjects = useMemo(() => {
        const lowercasedFilter = searchTerm.toLowerCase();

        return allSubjects.filter(subject => {
            const searchMatch = !lowercasedFilter || subject.title.toLowerCase().includes(lowercasedFilter);
            const moduleMatch = !selectedModule || subject.moduleId === modules.find(m => m.id === selectedModule)?.id;
            const universityMatch = !selectedUniversity || subject.universityId === selectedUniversity;

            return searchMatch && moduleMatch && universityMatch;
        });
    }, [searchTerm, selectedModule, selectedUniversity, allSubjects]);

    const handleModuleFilterChange = (e: ChangeEvent<HTMLSelectElement>) => {
        setSelectedModule(e.target.value);
        setSelectedUniversity(''); // Réinitialiser le filtre université
    };

    // Logique de pagination
    const indexOfLastSubject = currentPage * SUBJECTS_PER_PAGE;
    const indexOfFirstSubject = indexOfLastSubject - SUBJECTS_PER_PAGE;
    const currentSubjects = filteredSubjects.slice(indexOfFirstSubject, indexOfLastSubject);
    const totalPages = Math.ceil(filteredSubjects.length / SUBJECTS_PER_PAGE);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleModalFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validations côté client
            if (file.type !== 'application/pdf') {
                setFormError('Le fichier doit être un PDF.');
                return;
            }
            if (file.size > MAX_PDF_SIZE) {
                setFormError('Le fichier PDF dépasse 25 MB.');
                return;
            }
            setFormError(null);
            setActiveSubject(prev => ({ ...prev, file }));
        }
    };
    
    const handleModalSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);

        // Champs requis
        if (!activeSubject.title || !activeSubject.moduleId || !activeSubject.universityId) {
            setFormError('Veuillez renseigner le titre, le module et l’université.');
            return;
        }

        try {
            setIsSubmitting(true);

            // Helper pour upload PDF et récupérer l’URL publique
            const uploadIfNeeded = async (): Promise<string | null> => {
                if (!activeSubject.file) return null;
                const filename = `${Date.now()}_${activeSubject.file.name}`;
                const objectPath = `public/sujets/${filename}`;
                const uploadRes = await supabase
                    .storage
                    .from('sujets')
                    .upload(objectPath, activeSubject.file, {
                        contentType: 'application/pdf',
                        upsert: false,
                    });
                if (uploadRes.error) throw uploadRes.error;
                const { data: publicData } = supabase.storage.from('sujets').getPublicUrl(objectPath);
                return publicData.publicUrl || null;
            };

            if (activeSubject.id) {
                // Mise à jour
                const maybeUrl = await uploadIfNeeded();
                const updatePayload: any = {
                    titre: activeSubject.title,
                    module_id: activeSubject.moduleId,
                    universite_id: activeSubject.universityId,
                };
                if (activeSubject.year !== '' && activeSubject.year !== null) {
                    updatePayload.annee = Number(activeSubject.year);
                } else {
                    updatePayload.annee = null;
                }
                updatePayload.correction = activeSubject.correction ? String(activeSubject.correction) : null;
                if (maybeUrl) {
                    updatePayload.fichier_url = maybeUrl;
                }
                const updateRes = await supabase
                    .from('sujets')
                    .update(updatePayload)
                    .eq('id', activeSubject.id)
                    .select()
                    .single();
                if (updateRes.error) throw updateRes.error;

                const updated = updateRes.data;
                const module = modules.find(m => m.id === updated.module_id);
                const uni = universities.find(u => u.id === updated.universite_id);
                setAllSubjects(prev => prev.map(s => s.id === activeSubject.id ? {
                    id: updated.id,
                    title: updated.titre || 'Sans titre',
                    fileSize: s.fileSize,
                    pdfUrl: updated.fichier_url || s.pdfUrl,
                    moduleId: updated.module_id,
                    moduleName: module?.name || '',
                    universityId: updated.universite_id,
                    universityName: uni?.name || '',
                    correction: updated.correction ?? null,
                    year: updated.annee ?? null,
                } : s));
            } else {
                // Ajout
                if (!activeSubject.file) {
                    setFormError('Le fichier PDF est requis pour l’ajout.');
                    setIsSubmitting(false);
                    return;
                }
                const publicUrl = await uploadIfNeeded();
                const insertRes = await supabase
                    .from('sujets')
                    .insert({
                        titre: activeSubject.title,
                        module_id: activeSubject.moduleId,
                        universite_id: activeSubject.universityId,
                        fichier_url: publicUrl,
                        correction: activeSubject.correction ? String(activeSubject.correction) : null,
                        annee: activeSubject.year !== '' && activeSubject.year !== null ? Number(activeSubject.year) : null,
                    })
                    .select()
                    .single();
                if (insertRes.error) throw insertRes.error;
                const inserted = insertRes.data;
                const module = modules.find(m => m.id === inserted.module_id);
                const uni = universities.find(u => u.id === inserted.universite_id);
                const newEntry: SubjectInfo = {
                    id: inserted.id,
                    title: inserted.titre || 'Sans titre',
                    fileSize: activeSubject.file ? `${(activeSubject.file.size / 1024).toFixed(2)} KB` : 'N/A',
                    pdfUrl: inserted.fichier_url || '#',
                    moduleId: inserted.module_id,
                    moduleName: module?.name || '',
                    universityId: inserted.universite_id,
                    universityName: uni?.name || '',
                    correction: inserted.correction ?? null,
                    year: inserted.annee ?? null,
                };
                setAllSubjects(prev => [newEntry, ...prev]);
            }
            setIsModalOpen(false);
        } catch (err: any) {
            setFormError(err?.message || 'Une erreur est survenue.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteSubject = async () => {
        if (!subjectToDelete) return;
        try {
            const delRes = await supabase.from('sujets').delete().eq('id', subjectToDelete.id);
            if (delRes.error) throw delRes.error;
            setAllSubjects(prev => prev.filter(s => s.id !== subjectToDelete.id));
        } catch (err: any) {
            // Optionally surface deletion errors in future UI
        } finally {
            setSubjectToDelete(null);
        }
    };

    const openModalForEdit = (subject: SubjectInfo) => {
        const module = modules.find(m => m.id === subject.moduleId);
        const university = universities.find(u => u.id === subject.universityId);
        setActiveSubject({
            id: subject.id,
            title: subject.title,
            moduleId: module?.id || '',
            moduleName: module?.name || subject.moduleName,
            universityId: university?.id || '',
            universityName: university?.name || subject.universityName,
            file: null, // Ne pas pré-remplir le fichier
            correction: subject.correction || '',
            year: subject.year ?? ''
        });
        setIsModalOpen(true);
    };

    const openModalForAdd = () => {
        setActiveSubject(emptySubject);
        setIsModalOpen(true);
    };

    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Gérer les sujets</h1>

            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                <div className="w-full md:w-auto flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Rechercher un titre..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <select onChange={handleModuleFilterChange} value={selectedModule} className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">Tous les modules</option>
                        {modules.map(module => (
                            <option key={module.id} value={module.id}>{module.name}</option>
                        ))}
                    </select>
                    <select onChange={(e) => setSelectedUniversity(e.target.value)} value={selectedUniversity} disabled={!selectedModule} className="w-full px-3 py-2 border border-gray-300 bg-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed">
                        <option value="">Toutes les universités</option>
                        {(universitiesByModule[selectedModule as ModuleId] || []).map(uni => (
                            <option key={uni.id} value={uni.id}>{uni.name}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={openModalForAdd}
                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ml-4 flex-shrink-0"
                >
                    <DocumentPlusIcon className="h-5 w-5 mr-2" />
                    Ajouter un sujet
                </button>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-200">
                            <th className="py-3 px-4 font-semibold text-gray-600">Titre du sujet</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Module</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Université</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Taille</th>
                            <th className="py-3 px-4 font-semibold text-gray-600">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentSubjects.map((subject) => (
                            <tr key={subject.id} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="py-3 px-4">
                                    <div>
                                        <span className="font-medium text-gray-800">{subject.title}</span>
                                        <p className="text-xs text-gray-400 mt-1">Créé par : <span className="font-medium">{subject.creatorName}</span> (ID: {subject.creatorId})</p>
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-gray-600">{subject.moduleName}</td>
                                <td className="py-3 px-4 text-gray-600">{subject.universityName}</td>
                                <td className="py-3 px-4 text-gray-500 font-mono">{subject.fileSize}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <Link to={`/sujets/${subject.id}`} className="text-gray-500 hover:text-green-500 p-2" title="Voir le sujet"><EyeIcon className="h-5 w-5" /></Link>
                                    <button onClick={() => openModalForEdit(subject)} className="text-gray-500 hover:text-blue-500 p-2" title="Modifier"><PencilIcon className="h-5 w-5" /></button>
                                    <button onClick={() => setSubjectToDelete(subject)} className="text-gray-500 hover:text-red-500 p-2" title="Supprimer"><TrashIcon className="h-5 w-5" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Contrôles de pagination */}
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">
                        Page {currentPage} sur {totalPages}
                    </span>
                    <div className="flex items-center">
                        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                        </button>
                        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                        </button>
                    </div>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={activeSubject.id ? "Modifier le sujet" : "Ajouter un nouveau sujet"}
            >
                <form onSubmit={handleModalSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Titre du sujet</label>
                            <input type="text" name="title" id="title" required value={activeSubject.title} onChange={(e) => setActiveSubject(prev => ({ ...prev, title: e.target.value }))} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                        </div>
                        <div>
                            <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                            <SearchableSelect
                                options={modules}
                                value={activeSubject.moduleName}
                                onChange={(option) => setActiveSubject(prev => ({ ...prev, moduleId: option?.id || '', moduleName: option?.name || '', universityId: '', universityName: '' }))}
                                placeholder="Rechercher un module..."
                            />
                        </div>
                        <div>
                            <label htmlFor="universityId" className="block text-sm font-medium text-gray-700">Université</label>
                            <SearchableSelect
                                options={universitiesByModule[activeSubject.moduleId as ModuleId] || []}
                                value={activeSubject.universityName}
                                onChange={(option) => setActiveSubject(prev => ({ ...prev, universityId: option?.id || '', universityName: option?.name || '' }))}
                                disabled={!activeSubject.moduleId}
                                placeholder={!activeSubject.moduleId ? "Sélectionnez d'abord un module" : "Rechercher une université..."}
                            />
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Année (optionnel)</label>
                            <input
                                type="number"
                                name="year"
                                id="year"
                                min={1900}
                                max={2100}
                                value={activeSubject.year as number | ''}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, year: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ex: 2023"
                            />
                        </div>
                        <div>
                            <label htmlFor="correction" className="block text-sm font-medium text-gray-700">Correction (Markdown)</label>
                            <textarea
                                name="correction"
                                id="correction"
                                rows={6}
                                value={(activeSubject as any).correction || ''}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, correction: e.target.value }))}
                                placeholder="Saisissez la correction en Markdown (titres, listes, liens, tableaux...)"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                            <p className="mt-1 text-xs text-gray-500">Aperçu ci-dessous. Prend en charge GFM (listes, tableaux, etc.).</p>
                            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="prose prose-sm max-w-none">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {(((activeSubject as any).correction || '') as string).trim()}
                                    </ReactMarkdown>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="file" className="block text-sm font-medium text-gray-700">
                                Fichier PDF {activeSubject.id && <span className="text-xs text-gray-500">(Optionnel: laisser vide pour ne pas changer)</span>}
                            </label>
                            <input
                                type="file"
                                name="file"
                                id="file"
                                required={!activeSubject.id} // Requis uniquement pour l'ajout
                                accept="application/pdf"
                                onChange={handleModalFileChange}
                                className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                            {formError && (
                                <p className="mt-2 text-sm text-red-600">{formError}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">PDF uniquement, taille maximale 25 MB.</p>
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">{activeSubject.id ? 'Enregistrer' : 'Ajouter'}</button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={!!subjectToDelete}
                onClose={() => setSubjectToDelete(null)}
                title="Confirmer la suppression"
            >
                <div>
                    <p className="text-gray-600 mb-4">
                        Êtes-vous sûr de vouloir supprimer le sujet suivant ? Cette action est irréversible.
                    </p>
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <p className="font-bold text-gray-800">{subjectToDelete?.title}</p>
                        <p className="text-sm text-gray-500">{subjectToDelete?.moduleName} - {subjectToDelete?.universityName}</p>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button
                            type="button"
                            onClick={() => setSubjectToDelete(null)}
                            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                            Annuler
                        </button>
                        <button onClick={handleDeleteSubject} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors">Supprimer</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}