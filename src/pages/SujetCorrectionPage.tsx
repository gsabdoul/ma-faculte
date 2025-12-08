import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';
import { useUser } from '../context/UserContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PencilIcon, TrashIcon, FlagIcon } from '@heroicons/react/24/outline';
import { Modal } from '../components/ui/Modal';

interface Note {
  id: string;
  content: string;
  question_id: number;
}

interface Question {
  id: number;
  content: string;
  options?: { id: number; content: string; is_correct: boolean }[];
  note?: Note | null;
}


export function SujetCorrectionPage() {
  const { sujetId } = useParams<{ sujetId?: string }>();
  const navigate = useNavigate();
  const { user } = useUser();
  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNoteModalOpen, setNoteModalOpen] = useState(false);
  const [activeQuestionForNote, setActiveQuestionForNote] = useState<Question | null>(null);
  const [noteContent, setNoteContent] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isReportModalOpen, setReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);



  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!sujetId) throw new Error('Identifiant de sujet manquant');

        // Récupérer les détails du sujet et les questions associées
        const { data: subjectData, error: subjectError } = await supabase
          .from('sujets')
          .select('*, questions(*, options(*))')
          .eq('id', sujetId)
          .maybeSingle();

        if (subjectError) throw subjectError;

        // Récupérer les notes de l'utilisateur pour les questions de ce sujet
        if (user && subjectData?.questions) {
          const questionIds = subjectData.questions.map((q: Question) => q.id);
          const { data: notesData, error: notesError } = await supabase
            .from('user_notes')
            .select('*')
            .eq('user_id', user.id)
            .in('question_id', questionIds);

          if (notesError) console.error("Erreur de chargement des notes:", notesError);

          const notesMap = new Map(notesData?.map(note => [note.question_id, note]));
          subjectData.questions.forEach((q: Question) => q.note = notesMap.get(q.id));
        }
        // Récupérer la dernière session de quiz de l'utilisateur pour ce sujet
        if (user && subjectData) {
          const { data: quizSession, error: sessionError } = await supabase
            .from('user_quizzes')
            .select('answers')
            .eq('user_id', user.id)
            .eq('config->>sujetId', sujetId) // Filtrer par l'ID du sujet dans la config
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          subjectData.userAnswers = sessionError ? {} : quizSession?.answers || {};
        }

        if (cancel) return;
        setSubject(subjectData || null);
      } catch (e: any) {
        setError(e?.message || String(e));
        setSubject(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [sujetId, user]);

  if (loading) return <div className="p-4 text-center text-gray-600">Chargement de la correction...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Erreur: {error}</div>;
  if (!subject) return <div className="p-4 text-center text-red-500">Sujet non trouvé.</div>;

  const correction = subject.correction?.trim();
  if (!correction) {
    // Si aucune correction, revenir en arrière et informer
    navigate(-1);
    return <div className="p-4 text-center text-gray-600">Ce sujet n’a pas encore de correction.</div>;
  }

  const renderUserAnswer = (question: Question) => {
    const answer = subject.userAnswers?.[question.id];
    if (answer === undefined) {
      return <span className="text-gray-500 italic">Non répondu</span>;
    }

    if (question.options && question.options.length > 0) {
      const selectedOptionIds = Array.isArray(answer) ? answer : [answer];
      const selectedOptions = question.options
        .filter(opt => selectedOptionIds.includes(opt.id))
        .map(opt => {
          const isCorrect = opt.is_correct;
          return (
            <span key={opt.id} className={`px-2 py-1 rounded ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {opt.content}
            </span>
          );
        });
      return <div className="flex flex-wrap gap-2">{selectedOptions}</div>;
    }

    // Pour les QROC
    return <p className="bg-blue-50 border border-blue-200 rounded p-2">{String(answer)}</p>;
  };

  const openNoteModal = (question: Question) => {
    setActiveQuestionForNote(question);
    setNoteContent(question.note?.content || '');
    setNoteModalOpen(true);
  };

  const closeNoteModal = () => {
    setNoteModalOpen(false);
    setActiveQuestionForNote(null);
    setNoteContent('');
  };

  const handleSaveNote = async () => {
    if (!activeQuestionForNote || !user) return;
    setIsSavingNote(true);

    try {
      const { data, error } = await supabase
        .from('user_notes')
        .upsert({
          id: activeQuestionForNote.note?.id, // L'ID existant pour la mise à jour
          user_id: user.id,
          question_id: activeQuestionForNote.id,
          content: noteContent,
        }, { onConflict: 'user_id, question_id' }) // Assurez-vous que cette contrainte unique existe
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour l'état local
      setSubject((prev: any) => ({
        ...prev,
        questions: prev.questions.map((q: Question) =>
          q.id === activeQuestionForNote.id ? { ...q, note: data } : q
        ),
      }));

      closeNoteModal();
    } catch (err: any) {
      console.error("Erreur lors de la sauvegarde de la note:", err);
      alert("Erreur: " + err.message);
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!activeQuestionForNote?.note) return;
    if (!window.confirm("Voulez-vous vraiment supprimer cette note ?")) return;

    const { error } = await supabase.from('user_notes').delete().eq('id', activeQuestionForNote.note.id);
    if (error) alert("Erreur lors de la suppression.");
    else handleSaveNote(); // "Sauvegarder" une note vide supprime la référence locale
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !user || !reportDescription.trim()) return;

    setIsSubmittingReport(true);
    try {
      const { error: insertError } = await supabase
        .from('signalements')
        .insert({
          user_id: user.id,
          item_id: subject.id, // Utilisation de l'ID du sujet (UUID)
          type: 'sujet_correction',
          description: reportDescription.trim(),
        });

      if (insertError) throw insertError;

      alert('Votre signalement a été envoyé avec succès. Merci pour votre contribution !');
      setReportModalOpen(false);
      setReportDescription('');
    } catch (err: any) {
      alert(`Erreur lors de l'envoi du signalement : ${err.message}`);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
            <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-grow">
            <p className="text-sm text-gray-500">Correction du sujet</p>
            <h1 className="text-lg font-bold text-gray-800 truncate">{subject.titre || subject.title}</h1>
          </div>
        </div>
      </header>

      <main className="p-2 sm:p-4 md:p-6">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 space-y-10">
          {subject.questions && subject.questions.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Vos réponses</h2>
              {subject.questions.map((q: Question) => (
                <div key={q.id} className="p-4 bg-gray-50 rounded-lg group">
                  <div className="flex justify-between items-start">
                    <p className="font-semibold text-gray-700 mb-2 flex-1">{q.content}</p>
                    <button
                      onClick={() => openNoteModal(q)}
                      className={`ml-4 p-2 rounded-full transition-colors ${q.note ? 'text-blue-600 bg-blue-100' : 'text-gray-400 hover:bg-gray-200'}`}
                      title="Ajouter/Modifier une note"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="pl-4 border-l-2 border-blue-300 mt-2">
                    <p className="text-sm font-medium text-blue-700 mb-1">Votre réponse :</p>
                    <div className="text-gray-800">{renderUserAnswer(q)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Correction détaillée</h2>
              <button
                onClick={() => setReportModalOpen(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
              >
                <FlagIcon className="w-4 h-4" />
                Signaler une erreur
              </button>
            </div>
            <div className="prose prose-lg max-w-none prose-h2:text-xl prose-h2:font-semibold prose-h3:text-lg prose-h3:font-medium prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-code:bg-gray-100 prose-code:text-red-500 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ node, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer" />
                  ),
                  pre: ({ node, ...props }) => (
                    <pre {...props} className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto" />
                  ),
                  table: ({ node, ...props }) => (
                    <div className="overflow-x-auto">
                      <table {...props} className="min-w-full divide-y divide-gray-200" />
                    </div>
                  ),
                }}
              >
                {correction}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </main>

      <Modal
        isOpen={isNoteModalOpen}
        onClose={closeNoteModal}
        title={`Note sur la question`}
      >
        <div className="space-y-4">
          <p className="bg-gray-100 p-3 rounded-md text-sm font-medium text-gray-600">
            {activeQuestionForNote?.content}
          </p>
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            className="w-full h-40 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Écrivez vos notes personnelles ici..."
            autoFocus
          ></textarea>
          <div className="mt-6 flex justify-between items-center">
            <div>
              {activeQuestionForNote?.note && (
                <button type="button" onClick={handleDeleteNote} className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center gap-1">
                  <TrashIcon className="w-4 h-4" />
                  Supprimer
                </button>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={closeNoteModal} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                Annuler
              </button>
              <button type="button" onClick={handleSaveNote} disabled={isSavingNote} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
                {isSavingNote ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setReportModalOpen(false)}
        title={`Signaler une erreur sur la correction`}
      >
        <form onSubmit={handleReportSubmit}>
          <p className="text-sm text-gray-600 mb-4">
            Aidez-nous à améliorer la qualité des corrections. Décrivez l'erreur que vous avez trouvée (ex: information incorrecte, faute de frappe, explication peu claire).
          </p>
          <textarea
            value={reportDescription}
            onChange={(e) => setReportDescription(e.target.value)}
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Votre description de l'erreur..."
            required
          ></textarea>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setReportModalOpen(false)}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmittingReport} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300">
              {isSubmittingReport ? 'Envoi...' : 'Envoyer le signalement'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}