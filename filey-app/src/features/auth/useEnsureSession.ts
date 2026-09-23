import { useEffect, useState } from 'react';

import { supabase } from '@/src/lib/supabase/client';

/**
 * Filey has no sign-up flow yet: every device gets an anonymous Supabase
 * user on first launch (requires "Allow anonymous sign-ins" enabled in the
 * Supabase Auth settings), and the session is persisted locally so the same
 * anonymous identity - and therefore the same canvas - comes back on
 * relaunch. Swapping this for real email/OAuth sign-in later is a matter of
 * linking an identity to the existing anonymous user, not a data migration.
 */
export function useEnsureSession() {
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        if (!cancelled) setUserId(data.session.user.id);
        return;
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInAnonymously();
      if (cancelled) return;

      if (signInError) {
        setError(signInError.message);
        return;
      }
      setUserId(signInData.user?.id ?? null);
    }

    bootstrap();

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return { userId, error, isReady: userId !== null || error !== null };
}
