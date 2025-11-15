import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/solid';
import { supabase } from '../supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function SujetCorrectionPage() {
  const { sujetId } = useParams<{ sujetId?: string }>();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        if (!sujetId) throw new Error('Identifiant de sujet manquant');
        const res = await supabase.from('sujets').select('*').eq('id', sujetId).maybeSingle();
        if (res.error) throw res.error;
        if (cancel) return;
        setSubject(res.data || null);
      } catch (e: any) {
        setError(e?.message || String(e));
        setSubject(null);
      } finally {
        if (!cancel) setLoading(false);
      }
    };
    load();
    return () => { cancel = true; };
  }, [sujetId]);

  if (loading) return <div className="p-4 text-center text-gray-600">Chargement de la correction...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Erreur: {error}</div>;
  if (!subject) return <div className="p-4 text-center text-red-500">Sujet non trouvé.</div>;

  const correction = subject.correction?.trim();
  if (!correction) {
    // Si aucune correction, revenir en arrière et informer
    navigate(-1);
    return <div className="p-4 text-center text-gray-600">Ce sujet n’a pas encore de correction.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white p-4 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="p-2 mr-2 rounded-full hover:bg-gray-100">
            <ChevronLeftIcon className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-grow">
            <h1 className="text-xl font-bold text-gray-800 truncate">Correction</h1>
            <p className="text-sm text-gray-500">{subject.titre || subject.title}</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="prose max-w-none text-gray-800">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {correction}
            </ReactMarkdown>
          </div>
        </div>
      </main>
    </div>
  );
}