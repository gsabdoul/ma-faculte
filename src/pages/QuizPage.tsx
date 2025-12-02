import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { QuizSelection } from '../components/quiz/QuizSelection';
import QuizPlayer from '../components/quiz/QuizPlayer';
import { supabase } from '../supabase';

interface Question {
    id: number;
    content: string;
    type: 'qcm' | 'qroc' | 'cas_clinique';
    points: number;
    image_url: string | null;
    numero: number;
    explanation: string | null;
    expected_answer: string | null;
    options?: any[];
}

export function QuizPage() {
    const { subjectId } = useParams<{ subjectId?: string }>();
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(subjectId || null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(false);

    // Fetch questions when subject is selected
    useEffect(() => {
        if (!selectedSubjectId) {
            setQuestions([]);
            return;
        }

        const fetchQuestions = async () => {
            setLoading(true);
            try {
                // Fetch questions for the subject
                const { data: questionsData, error: questionsError } = await supabase
                    .from('questions')
                    .select('*')
                    .eq('sujet_id', selectedSubjectId)
                    .order('numero');

                if (questionsError) throw questionsError;

                if (!questionsData || questionsData.length === 0) {
                    setQuestions([]);
                    return;
                }

                // Fetch options for QCM questions
                const questionIds = questionsData.map(q => q.id);
                const { data: optionsData, error: optionsError } = await supabase
                    .from('options')
                    .select('*')
                    .in('question_id', questionIds);

                if (optionsError) throw optionsError;

                // Merge options with questions
                const questionsWithOptions = questionsData.map(q => ({
                    ...q,
                    options: optionsData?.filter(o => o.question_id === q.id) || []
                }));

                setQuestions(questionsWithOptions);
            } catch (err) {
                console.error('Error fetching questions:', err);
                setQuestions([]);
            } finally {
                setLoading(false);
            }
        };

        fetchQuestions();
    }, [selectedSubjectId]);

    // Update selected subject when URL param changes
    useEffect(() => {
        if (subjectId) {
            setSelectedSubjectId(subjectId);
        }
    }, [subjectId]);

    const handleSelectSubject = (subjectId: string) => {
        setSelectedSubjectId(subjectId);
    };

    const handleBack = () => {
        setSelectedSubjectId(null);
        setQuestions([]);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <>
            {selectedSubjectId && questions.length > 0 ? (
                <QuizPlayer
                    questions={questions}
                    onBack={handleBack}
                    mode="practice"
                />
            ) : selectedSubjectId ? (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center">
                        <p className="text-gray-600 text-lg mb-4">Aucune question disponible pour ce sujet</p>
                        <button
                            onClick={handleBack}
                            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                        >
                            Retour
                        </button>
                    </div>
                </div>
            ) : (
                <QuizSelection onSelectSubject={handleSelectSubject} />
            )}
        </>
    );
}
