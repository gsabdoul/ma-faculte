import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../../supabase';

export function RequireAuth() {
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthed(!!data.session);
      setChecking(false);
    };
    checkSession();
  }, []);

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600">Chargement...</div>
      </div>
    );
  }

  if (!isAuthed) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}