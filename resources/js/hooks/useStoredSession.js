import { useState } from 'react';
import api from '../api.js';

export default function useStoredSession() {
  const [session, setSessionState] = useState(() => {
    const raw = localStorage.getItem('corpu_session');
    return raw ? JSON.parse(raw) : null;
  });

  const setSession = (nextSession) => {
    if (nextSession) {
      localStorage.setItem('corpu_session', JSON.stringify(nextSession));
      api.defaults.headers.common.Authorization = `Bearer ${nextSession.access_token}`;
    } else {
      localStorage.removeItem('corpu_session');
      delete api.defaults.headers.common.Authorization;
    }
    setSessionState(nextSession);
  };

  if (session?.access_token) {
    api.defaults.headers.common.Authorization = `Bearer ${session.access_token}`;
  }

  return [session, setSession];
}
