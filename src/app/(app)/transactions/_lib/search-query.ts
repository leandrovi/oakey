"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SEARCH_QUERY_DEBOUNCE_MS = 250;

export type SearchQueryWrite = (q: string, mode: "push" | "replace") => void;

/**
 * The field shows `query` at once. `q` is written to the URL only after typing
 * pauses, or on demand. A URL change this hook did not write replaces the draft.
 */
export function useDebouncedSearchQuery(urlQ: string, write: SearchQueryWrite) {
  const [draft, setDraft] = useState(urlQ);
  const [seenUrl, setSeenUrl] = useState(urlQ);
  const [expected, setExpected] = useState<string | null>(null);
  const draftRef = useRef(draft);
  const urlRef = useRef(urlQ);
  const writeRef = useRef(write);
  const expectedRef = useRef<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    draftRef.current = draft;
    urlRef.current = urlQ;
    writeRef.current = write;
  });

  if (urlQ !== seenUrl) {
    setSeenUrl(urlQ);
    if (expected !== null && urlQ === expected) {
      setExpected(null);
    } else {
      setDraft(urlQ);
      setExpected(null);
    }
  }

  useEffect(() => {
    if (expectedRef.current !== null && urlQ === expectedRef.current) {
      expectedRef.current = null;
      return;
    }
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    expectedRef.current = null;
  }, [urlQ]);

  useEffect(() => {
    return () => {
      if (timer.current != null) clearTimeout(timer.current);
    };
  }, []);

  const cancelTimer = useCallback(() => {
    if (timer.current != null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const remember = useCallback((q: string) => {
    if (q === urlRef.current) {
      expectedRef.current = null;
      setExpected(null);
      return;
    }
    expectedRef.current = q;
    setExpected(q);
  }, []);

  const publish = useCallback(
    (mode: "push" | "replace") => {
      const q = draftRef.current;
      remember(q);
      if (q === urlRef.current) return;
      writeRef.current(q, mode);
    },
    [remember],
  );

  const onQueryChange = useCallback(
    (value: string) => {
      draftRef.current = value;
      setDraft(value);
      cancelTimer();
      timer.current = setTimeout(() => {
        timer.current = null;
        publish("replace");
      }, SEARCH_QUERY_DEBOUNCE_MS);
    },
    [cancelTimer, publish],
  );

  const commitQuery = useCallback(() => {
    cancelTimer();
    publish("replace");
  }, [cancelTimer, publish]);

  const consumeDraft = useCallback(() => {
    cancelTimer();
    const q = draftRef.current;
    remember(q);
    return q;
  }, [cancelTimer, remember]);

  const replaceDraft = useCallback(
    (q: string) => {
      cancelTimer();
      draftRef.current = q;
      setDraft(q);
      remember(q);
    },
    [cancelTimer, remember],
  );

  return { query: draft, onQueryChange, commitQuery, consumeDraft, replaceDraft };
}
