import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../supabase';
import { useUser } from '../../hooks/useUser';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Modal } from '../../components/ui/Modal';
import {
    ArrowLeftIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    BookOpenIcon,
    CheckCircleIcon,
    AcademicCapIcon,
    BeakerIcon,
    DocumentTextIcon,
    PhotoIcon,
    XMarkIcon,
    Bars3Icon
} from '@heroicons/react/24/outline';

interface Option {
    id: string;
    content: string;
    isCorrect: boolean;
}

interface Question {
    id: string;
    content: string;
    isCorrect: boolean;
    type: string;
    options?: Option[];
    explanation?: string;
    points?: number;
    imageUrl?: string;
}

function SortableQuestionItem({ question, openModalForEdit, handleDeleteQuestion, getTypeBadge }: { question: Question, openModalForEdit: (q: Question) => void, handleDeleteQuestion: (id: string) => void, getTypeBadge: (type: string) => React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id: question.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} key={question.id} className="p-4 sm:p-6 hover:bg-gray-50 transition-colors group">
            <div className="flex justify-between items-start gap-4">
                <div className="flex items-center text-gray-400 cursor-grab" {...attributes} {...listeners}>
                    <Bars3Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between md:justify-start gap-3">
                        {getTypeBadge(question.type)}
                        <span className="text-xs text-gray-400 font-mono">ID: {String(question.id).slice(0, 8)}</span>
                        {question.points && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                {question.points} pts
                            </span>
                        )}
                    </div>
                    <p className="text-gray-900 font-medium text-lg leading-relaxed">{question.content}</p>
                    {question.imageUrl && (
                        <div className="mt-2">
                            <img src={question.imageUrl} alt="Illustration question" className="max-h-48 rounded-lg border border-gray-200" />
                        </div>
                    )}
                    {question.type === 'qcm' && question.options && question.options.length > 0 && (
                        <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Options proposées</p>
                            <ul className="space-y-2">
                                {question.options.map((option) => (
                                    <li key={option.id} className="flex items-start">
                                        <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center mr-3 flex-shrink-0 ${option.isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                                            {option.isCorrect && <div className="w-2 h-2 rounded-full bg-green-500" />}
                                        </div>
                                        <span className={`${option.isCorrect ? 'text-green-700 font-medium' : 'text-gray-600'}`}>{option.content}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openModalForEdit(question)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="Modifier">
                        <PencilSquareIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteQuestion(question.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors" title="Supprimer">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export function SubjectDetailsPage() {
    const { subjectId } = useParams<{ subjectId: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { userProfile } = useUser();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
    const [questionType, setQuestionType] = useState('qcm');
    const [newOption, setNewOption] = useState('');
    const [subjectDetails, setSubjectDetails] = useState({ title: '', moduleName: '' });
    const [uploading, setUploading] = useState(false);
    const [editingOption, setEditingOption] = useState<{ id: string; content: string } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        const fetchQuestions = async () => {
            const { data, error } = await supabase
                .from('questions')
                .select('id, content, expected_answer, type, explanation, points, image_url, options(id, content, is_correct)')
                .eq('sujet_id', subjectId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching questions:', error.message, error.details);
            } else {
                setQuestions(data?.map((item) => ({
                    id: item.id,
                    content: item.content,
                    isCorrect: item.expected_answer === 'true',
                    type: item.type,
                    explanation: item.explanation,
                    points: item.points,
                    imageUrl: item.image_url,
                    options: item.options?.map((opt) => ({ id: opt.id, content: opt.content, isCorrect: opt.is_correct })) || [],
                })) || []);
            }
        };

        const fetchSubjectDetails = async () => {
            const { data, error } = await supabase
                .from('sujets')
                .select('annee, session, modules!inner(nom)')
                .eq('id', subjectId)
                .single();

            if (error) {
                console.error('Error fetching subject details:', error);
            } else {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const moduleName = Array.isArray(data.modules) ? data.modules[0]?.nom : (data.modules as any)?.nom;
                const title = `Sujet de ${moduleName} - ${data.annee || ''} (${data.session || 'Normale'})`;
                setSubjectDetails({
                    title: title,
                    moduleName: moduleName,
                });
            }
        };

        fetchQuestions();
        fetchSubjectDetails();
    }, [subjectId]);

    const handleImageUpload = async (file: File) => {
        try {
            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${subjectId}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('questions')
                .upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from('questions')
                .getPublicUrl(filePath);

            setActiveQuestion(prev => prev ? { ...prev, imageUrl: data.publicUrl } : null);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Erreur lors du téléchargement de l\'image');
        } finally {
            setUploading(false);
        }
    };

    const handleAddQuestion = async () => {
        if (!activeQuestion?.content.trim()) return;

        const payload = {
            content: activeQuestion.content,
            type: questionType,
            sujet_id: subjectId,
            explanation: activeQuestion.explanation,
            points: activeQuestion.points || 1,
            image_url: activeQuestion.imageUrl
        };

        let questionData: Question;

        if (activeQuestion.id) {
            // Update existing question
            const { data, error } = await supabase
                .from('questions')
                .update(payload)
                .eq('id', activeQuestion.id)
                .select()
                .single();

            if (error) {
                console.error('Error updating question:', error);
                return;
            }
            questionData = {
                id: data.id,
                content: data.content,
                isCorrect: data.expected_answer === 'true',
                type: data.type,
                explanation: data.explanation,
                points: data.points,
                imageUrl: data.image_url
            };

            // Handle options for update: Delete all existing and re-insert
            if (questionType === 'qcm') {
                const { error: deleteError } = await supabase
                    .from('options')
                    .delete()
                    .eq('question_id', activeQuestion.id);

                if (deleteError) console.error('Error deleting old options:', deleteError);
            }
        } else {
            // Create new question
            const { data, error } = await supabase
                .from('questions')
                .insert(payload)
                .select()
                .single();

            if (error) {
                console.error('Error adding question:', error);
                return;
            }
            questionData = {
                id: data.id,
                content: data.content,
                isCorrect: data.expected_answer === 'true',
                type: data.type,
                explanation: data.explanation,
                points: data.points,
                imageUrl: data.image_url
            };
        }

        // Handle options insertion (for both new and updated questions)
        if (questionType === 'qcm' && activeQuestion.options && activeQuestion.options.length > 0) {
            const optionsPayload = activeQuestion.options.map((opt) => ({
                content: opt.content,
                is_correct: opt.isCorrect,
                question_id: questionData.id,
            }));

            const { error: optionsError } = await supabase.from('options').insert(optionsPayload);

            if (optionsError) {
                console.error('Error adding options:', optionsError);
            }
        }

        // Update local state
        setQuestions((prev) => {
            if (activeQuestion.id) {
                return prev.map((q) => (q.id === questionData.id ? {
                    ...questionData,
                    options: activeQuestion.options || [],
                } : q));
            } else {
                return [...prev, {
                    ...questionData,
                    options: activeQuestion.options || [],
                }];
            }
        });

        setIsModalOpen(false);
        setActiveQuestion(null);
    };

    const handleDeleteQuestion = async (questionId: string) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette question ?')) return;

        const { error: optionsError } = await supabase
            .from('options')
            .delete()
            .eq('question_id', questionId);

        if (optionsError) {
            console.error('Error deleting options:', optionsError);
            return;
        }

        const { error: questionError } = await supabase
            .from('questions')
            .delete()
            .eq('id', questionId);

        if (questionError) {
            console.error('Error deleting question:', questionError);
        } else {
            setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        }
    };

    const openModalForAdd = () => {
        setActiveQuestion({ id: '', content: '', isCorrect: false, type: 'qcm', options: [], points: 1 });
        setEditingOption(null);
        setIsModalOpen(true);
    };

    const openModalForEdit = (question: Question) => {
        setActiveQuestion(question);
        setQuestionType(question.type);
        setIsModalOpen(true);
        setEditingOption(null);
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'qcm':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"><CheckCircleIcon className="w-3 h-3 mr-1" /> QCM</span>;
            case 'qroc':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"><DocumentTextIcon className="w-3 h-3 mr-1" /> QROC</span>;
            case 'cas_clinique':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"><BeakerIcon className="w-3 h-3 mr-1" /> Cas Clinique</span>;
            default:
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{type}</span>;
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDragEnd = (event: any) => {
        const { active, over } = event;

        if (active && over && active.id !== over.id) {
            let reorderedQuestions: Question[] = [];
            // Mettre à jour l'état local de manière synchrone
            setQuestions((prevQuestions) => {
                const oldIndex = prevQuestions.findIndex((q) => q.id === active.id);
                const newIndex = prevQuestions.findIndex((q) => q.id === over.id);
                const newItems = [...prevQuestions];
                const [removed] = newItems.splice(oldIndex, 1);
                newItems.splice(newIndex, 0, removed);
                reorderedQuestions = newItems;
                return reorderedQuestions;
            });

            // Préparer les données pour la mise à jour en batch
            const updates = reorderedQuestions.map((question, index) => ({
                id: question.id,
                numero: index, // Le nouvel ordre est l'index dans le tableau
            }));

            // Envoyer les mises à jour à Supabase
            supabase.from('questions').upsert(updates).then(({ error }) => {
                if (error) console.error("Erreur lors de la mise à jour de l'ordre des questions:", error);
            });
        }
    };


    return (
        <div className="min-h-screen bg-gray-50 p-2 sm:p-4 md:p-8">
            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <button
                    onClick={() => {
                        // On regarde si une page de provenance a été passée dans l'état de la route
                        const from = location.state?.from;
                        if (from) {
                            navigate(from); // On retourne à la page d'origine
                        } else {
                            // Sinon, on utilise une route par défaut basée sur le rôle
                            if (userProfile?.role === 'admin') {
                                navigate('/admin/sujets');
                            } else if (userProfile?.role === 'writer') {
                                navigate('/writer/dashboard');
                            } else {
                                navigate(-1); // Fallback de dernier recours
                            }
                        }
                    }}
                    className="flex items-center text-gray-500 hover:text-gray-700 mb-4 transition-colors"
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Retour
                </button>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{subjectDetails.title}</h1>
                        <div className="flex items-center mt-2 text-gray-600">
                            <BookOpenIcon className="w-5 h-5 mr-2" />
                            <span className="font-medium">{subjectDetails.moduleName}</span>
                        </div>
                    </div>
                    <button
                        onClick={openModalForAdd}
                        className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Ajouter une question
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <AcademicCapIcon className="w-5 h-5 mr-2 text-indigo-500" />
                            Banque de questions
                            <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                {questions.length}
                            </span>
                        </h2>
                    </div>

                    {questions.length > 0 ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={questions} strategy={verticalListSortingStrategy}>
                                <div className="divide-y divide-gray-200">
                                    {questions.map((question) => (
                                        <SortableQuestionItem
                                            key={question.id}
                                            question={question}
                                            openModalForEdit={openModalForEdit}
                                            handleDeleteQuestion={handleDeleteQuestion}
                                            getTypeBadge={getTypeBadge}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    ) : (
                        <div className="p-6 sm:p-12 text-center">
                            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune question</h3>
                            <p className="text-gray-500 mb-6">Commencez par ajouter votre première question à ce sujet.</p>
                            <button
                                onClick={openModalForAdd}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                            >
                                <PlusIcon className="w-4 h-4 mr-2" />
                                Créer une question
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <Modal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    title={activeQuestion?.id ? 'Modifier la question' : 'Nouvelle question'}
                >
                    <div className="space-y-5">
                        <div className="space-y-2">
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type de question</label>
                            <select
                                id="type"
                                value={questionType}
                                onChange={(e) => setQuestionType(e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                            >
                                <option value="qcm">QCM (Choix Multiples)</option>
                                <option value="qroc">QROC (Réponse Courte)</option>
                                <option value="cas_clinique">Cas Clinique</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="points" className="block text-sm font-medium text-gray-700">Points</label>
                                <input
                                    type="number"
                                    id="points"
                                    min="0.5"
                                    step="0.5"
                                    value={activeQuestion?.points || 1}
                                    onChange={(e) => setActiveQuestion((prev) => prev ? { ...prev, points: parseFloat(e.target.value) } : null)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="content" className="block text-sm font-medium text-gray-700">Énoncé de la question</label>
                            <textarea
                                id="content"
                                rows={3}
                                value={activeQuestion?.content || ''}
                                onChange={(e) => setActiveQuestion((prev) => prev ? { ...prev, content: e.target.value } : null)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                                placeholder="La mitochondrie est..."
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">Image d'illustration (optionnel)</label>
                            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-500 transition-colors">
                                <div className="space-y-1 text-center">
                                    {activeQuestion?.imageUrl ? (
                                        <div className="relative inline-block">
                                            <img src={activeQuestion.imageUrl} alt="Preview" className="h-32 rounded-lg" />
                                            <button
                                                onClick={() => setActiveQuestion(prev => prev ? { ...prev, imageUrl: undefined } : null)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-sm"
                                            >
                                                <XMarkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600">
                                                <label
                                                    htmlFor="file-upload"
                                                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                                >
                                                    <span>Télécharger une image</span>
                                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleImageUpload(file);
                                                    }} disabled={uploading} />
                                                </label>
                                            </div>
                                            <p className="text-xs text-gray-500">PNG, JPG, WEBP jusqu'à 5MB</p>
                                        </>
                                    )}
                                    {uploading && <p className="text-sm text-indigo-600">Téléchargement en cours...</p>}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="explanation" className="block text-sm font-medium text-gray-700">Explication / Correction (optionnel)</label>
                            <textarea
                                id="explanation"
                                rows={3}
                                value={activeQuestion?.explanation || ''}
                                onChange={(e) => setActiveQuestion((prev) => prev ? { ...prev, explanation: e.target.value } : null)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border"
                                placeholder="Expliquez pourquoi la réponse est vraie/fausse..."
                            />
                        </div>

                        {questionType === 'qcm' && (
                            <div className="space-y-4 pt-4 border-t border-gray-100">
                                <label className="block text-sm font-medium text-gray-700">Options de réponse</label>

                                <div className="space-y-3">
                                    {activeQuestion?.options?.map((option, index) => (
                                        <div key={index} className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={option.isCorrect}
                                                onChange={() => {
                                                    const newOptions = [...(activeQuestion.options || [])];
                                                    newOptions[index] = { ...newOptions[index], isCorrect: !newOptions[index].isCorrect };
                                                    setActiveQuestion(prev => prev ? { ...prev, options: newOptions } : null);
                                                }}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            {editingOption?.id === option.id ? (
                                                <input
                                                    type="text"
                                                    value={editingOption?.content || ''}
                                                    onChange={(e) => setEditingOption({ ...editingOption, content: e.target.value })}
                                                    onBlur={() => {
                                                        if (editingOption) {
                                                            const newOptions = activeQuestion?.options?.map(opt =>
                                                                opt.id === editingOption.id ? { ...opt, content: editingOption.content } : opt
                                                            );
                                                            setActiveQuestion(prev => prev ? { ...prev, options: newOptions } : null);
                                                        }
                                                        setEditingOption(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            if (editingOption) {
                                                                const newOptions = activeQuestion?.options?.map(opt =>
                                                                    opt.id === editingOption.id ? { ...opt, content: editingOption.content } : opt
                                                                );
                                                                setActiveQuestion(prev => prev ? { ...prev, options: newOptions } : null);
                                                            }
                                                            setEditingOption(null);
                                                        }
                                                    }}
                                                    autoFocus
                                                    className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                                />
                                            ) : (
                                                <span className="flex-1 text-sm text-gray-700">{option.content}</span>
                                            )}
                                            <button onClick={() => setEditingOption({ id: option.id, content: option.content })} className="text-gray-400 hover:text-indigo-500">
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newOptions = activeQuestion.options?.filter((_, i) => i !== index);
                                                    setActiveQuestion(prev => prev ? { ...prev, options: newOptions } : null);
                                                }}
                                                className="text-gray-400 hover:text-red-500"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newOption}
                                        onChange={(e) => setNewOption(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                if (newOption.trim()) {
                                                    setActiveQuestion((prev) => prev ? { ...prev, options: [...(prev.options || []), { id: crypto.randomUUID(), content: newOption, isCorrect: false }] } : null);
                                                    setNewOption('');
                                                }
                                            }
                                        }}
                                        className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                                        placeholder="Nouvelle option..."
                                    />
                                    <button
                                        onClick={() => {
                                            if (newOption.trim()) {
                                                setActiveQuestion((prev) => prev ? { ...prev, options: [...(prev.options || []), { id: crypto.randomUUID(), content: newOption, isCorrect: false }] } : null);
                                                setNewOption('');
                                            }
                                        }}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleAddQuestion}
                                disabled={uploading}
                                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${uploading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                            >
                                {activeQuestion?.id ? 'Enregistrer les modifications' : 'Ajouter la question'}
                            </button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}