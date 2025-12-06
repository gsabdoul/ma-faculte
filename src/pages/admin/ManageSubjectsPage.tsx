import { useState, useMemo, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
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
import { Modal } from '../../components/ui/Modal';
import { SearchableSelect } from '../../components/ui/SearchableSelect';

type ModuleId = string;

// Types for fetched data
// Simplified frontend shapes: we map DB fields to { id, name }
type Module = { id: string; name: string };
type University = { id: string; name: string };
type Faculty = { id: string; name: string };
type Level = { id: string; name: string };

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
    faculteId: string;
    faculteName: string;
    niveauId: string;
    niveauName: string;
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
    year: '' as string | number | '',
    faculteId: '',
    faculteName: '',
    niveauId: '',
    niveauName: '',
};

export function ManageSubjectsPage() {
    const navigate = useNavigate();
    const { user } = useUser();

    // États pour la recherche, la pagination et les données
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedUniversity, setSelectedUniversity] = useState('');
    const [allSubjects, setAllSubjects] = useState<SubjectInfo[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [universities, setUniversities] = useState<University[]>([]);
    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);

    // Load modules, universites, faculties, and levels from Supabase on mount
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const [modsRes, unisRes, sujetsRes, facsRes, levelsRes] = await Promise.all([
                    supabase.from('modules').select('id, nom'),
                    supabase.from('universites').select('id, nom'),
                    supabase.from('sujets').select('id, titre, module_id, universite_id, faculte_id, niveau_id, annee, correction, created_by'),
                    supabase.from('facultes').select('id, nom'),
                    supabase.from('niveaux').select('id, nom'),
                ]);

                if (cancelled) return;

                console.log('Modules:', modsRes.data);
                console.log('Universités:', unisRes.data);
                console.log('Facultés:', facsRes.data);
                console.log('Niveaux:', levelsRes.data);
                console.log('Sujets:', sujetsRes.data);

                if (modsRes.error) throw modsRes.error;
                if (unisRes.error) throw unisRes.error;
                if (sujetsRes.error) throw sujetsRes.error;
                if (facsRes.error) throw facsRes.error;
                if (levelsRes.error) throw levelsRes.error;

                const mods: Module[] = (modsRes.data || []).map((m: any) => ({ id: m.id, name: m.nom }));
                const unis: University[] = (unisRes.data || []).map((u: any) => ({ id: u.id, name: u.nom }));
                const facs: Faculty[] = (facsRes.data || []).map((f: any) => ({ id: f.id, name: f.nom }));
                const lvls: Level[] = (levelsRes.data || []).map((l: any) => ({ id: l.id, name: l.nom }));

                const sujets = (sujetsRes.data || []).map((s: any) => {
                    const module = mods.find(m => m.id === s.module_id);
                    const uni = unis.find(u => u.id === s.universite_id);
                    const fac = facs.find(f => f.id === s.faculte_id);
                    const lvl = lvls.find(l => l.id === s.niveau_id);
                    return {
                        id: s.id,
                        title: s.titre || 'Sans titre',
                        fileSize: 'N/A',
                        pdfUrl: s.fichier_url || '#',
                        moduleId: s.module_id,
                        moduleName: module?.name || '',
                        universityId: s.universite_id,
                        universityName: uni?.name || '',
                        faculteId: s.faculte_id,
                        faculteName: fac?.name || '',
                        niveauId: s.niveau_id,
                        niveauName: lvl?.name || '',
                        correction: s.correction ?? null,
                        year: s.annee ?? null,
                    };
                });

                setModules(mods);
                setUniversities(unis);
                setFaculties(facs);
                setLevels(lvls);
                setAllSubjects(sujets);
            } catch (_err) {
                console.error('Error loading data:', _err);
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

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleModalSubmit = async (e: FormEvent) => {
        e.preventDefault();

        // Champs requis
        if (!activeSubject.title || !activeSubject.moduleId || !activeSubject.universityId) {
            alert('Veuillez renseigner le titre, le module et l’université.');
            return;
        }

        try {
            setIsSubmitting(true);

            const uploadIfNeeded = async (): Promise<string | null> => {
                if (!activeSubject.file) return null;
                const filename = `${Date.now()}_${activeSubject.file.name}`;
                const objectPath = `public/sujets/${filename}`;
                const uploadRes = await supabase
                    .storage
                    .from('sujets')
                    .upload(objectPath, activeSubject.file, {
                        contentType: activeSubject.file.type,
                        upsert: false,
                    });
                if (uploadRes.error) throw uploadRes.error;
                const { data: publicData } = supabase.storage.from('sujets').getPublicUrl(objectPath);
                return publicData.publicUrl || null;
            };

            const maybeUrl = await uploadIfNeeded();
            const payload: any = {
                titre: activeSubject.title,
                module_id: activeSubject.moduleId,
                universite_id: activeSubject.universityId,
                faculte_id: activeSubject.faculteId,
                niveau_id: activeSubject.niveauId,
                fichier_url: maybeUrl || null,
                correction: activeSubject.correction ? String(activeSubject.correction) : null,
                annee: activeSubject.year !== '' && activeSubject.year !== null ? Number(activeSubject.year) : null,
            };

            if (activeSubject.id) {
                // Mise à jour
                const updateRes = await supabase
                    .from('sujets')
                    .update(payload)
                    .eq('id', activeSubject.id)
                    .select()
                    .single();
                if (updateRes.error) throw updateRes.error;
            } else {
                // Ajout
                const insertRes = await supabase
                    .from('sujets')
                    .insert({ ...payload, created_by: user?.id })
                    .select()
                    .single();
                if (insertRes.error) throw insertRes.error;
            }

            setIsModalOpen(false);
        } catch (err: any) {
            alert(err?.message || 'Une erreur est survenue.');
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
        const faculte = faculties.find(f => f.id === subject.faculteId);
        const niveau = levels.find(l => l.id === subject.niveauId);
        setActiveSubject({
            id: subject.id,
            title: subject.title,
            moduleId: module?.id || '',
            moduleName: module?.name || subject.moduleName,
            universityId: university?.id || '',
            universityName: university?.name || subject.universityName,
            file: null, // Ne pas pré-remplir le fichier
            correction: subject.correction || '',
            year: subject.year ?? '',
            faculteId: faculte?.id || '',
            faculteName: faculte?.name || subject.faculteName,
            niveauId: niveau?.id || '',
            niveauName: niveau?.name || subject.niveauName,
        });
        setIsModalOpen(true);
    };

    const openModalForAdd = () => {
        setActiveSubject(emptySubject);
        setIsModalOpen(true);
    };

    const openSubjectDetails = (subjectId: string) => {
        navigate(`/admin/sujets/${subjectId}`); // Correction de la route
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
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <button
                                        onClick={() => openSubjectDetails(subject.id)}
                                        className="text-gray-500 hover:text-green-500 p-2"
                                        title="Voir le sujet"
                                    >
                                        <EyeIcon className="h-5 w-5" />
                                    </button>
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
                            <input
                                type="text"
                                name="title"
                                id="title"
                                required
                                value={activeSubject.title}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, title: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="moduleId" className="block text-sm font-medium text-gray-700">Module</label>
                            <SearchableSelect
                                options={modules}
                                value={activeSubject.moduleName}
                                onChange={(option: any) => setActiveSubject(prev => ({ ...prev, moduleId: option?.id || '', moduleName: option?.name || '' }))}
                                placeholder="Rechercher un module..."
                            />
                        </div>
                        <div>
                            <label htmlFor="universityId" className="block text-sm font-medium text-gray-700">Université</label>
                            <SearchableSelect
                                options={universities}
                                value={activeSubject.universityName}
                                onChange={(option: any) => setActiveSubject(prev => ({ ...prev, universityId: option?.id || '', universityName: option?.name || '' }))}
                                placeholder="Rechercher une université..."
                            />
                        </div>
                        <div>
                            <label htmlFor="faculteId" className="block text-sm font-medium text-gray-700">Faculté</label>
                            <SearchableSelect
                                options={faculties}
                                value={activeSubject.faculteName}
                                onChange={(option: any) => setActiveSubject(prev => ({ ...prev, faculteId: option?.id || '', faculteName: option?.name || '' }))}
                                placeholder="Rechercher une faculté..."
                            />
                        </div>
                        <div>
                            <label htmlFor="niveauId" className="block text-sm font-medium text-gray-700">Niveau</label>
                            <SearchableSelect
                                options={levels}
                                value={activeSubject.niveauName}
                                onChange={(option: any) => setActiveSubject(prev => ({ ...prev, niveauId: option?.id || '', niveauName: option?.name || '' }))}
                                placeholder="Rechercher un niveau..."
                            />
                        </div>
                        <div>
                            <label htmlFor="year" className="block text-sm font-medium text-gray-700">Année</label>
                            <input
                                type="number"
                                name="year"
                                id="year"
                                value={activeSubject.year || ''}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, year: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="correction" className="block text-sm font-medium text-gray-700">Correction (HTML ou Texte)</label>
                            <textarea
                                name="correction"
                                id="correction"
                                rows={4}
                                value={activeSubject.correction || ''}
                                onChange={(e) => setActiveSubject(prev => ({ ...prev, correction: e.target.value }))}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
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
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            {activeSubject.id ? 'Enregistrer' : 'Ajouter'}
                        </button>
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
                        <button
                            onClick={handleDeleteSubject}
                            className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Supprimer
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}