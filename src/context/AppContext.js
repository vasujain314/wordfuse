import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import fragments from '../../assets/fragments.json';
import { loadBundledDictionary } from '../services/dictionaryService';
import {
  createStorageService,
  DEFAULT_SETTINGS,
  sanitizeSettings,
} from '../services/storageService';

const AppContext = createContext(null);

/**
 * Holds app-wide state: settings, the loaded dictionary and storage.
 */
export function AppProvider({ children }) {
  const storage = useMemo(() => createStorageService(), []);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const latestSettings = useRef(DEFAULT_SETTINGS);
  const [dictionary, setDictionary] = useState({ status: 'idle', repository: null, error: null });
  const loading = useRef(null);

  useEffect(() => {
    let active = true;
    storage.loadSettings().then((loaded) => {
      if (!active) return;
      latestSettings.current = loaded;
      setSettings(loaded);
    });
    return () => {
      active = false;
    };
  }, [storage]);

  const loadDictionary = useCallback(() => {
    if (loading.current) return loading.current;
    setDictionary({ status: 'loading', repository: null, error: null });
    loading.current = loadBundledDictionary()
      .then((repository) => {
        setDictionary({ status: 'ready', repository, error: null });
        return repository;
      })
      .catch((error) => {
        loading.current = null;
        setDictionary({ status: 'error', repository: null, error });
        return null;
      });
    return loading.current;
  }, []);

  // Updates build on the latest value so quick repeated taps are never lost.
  const updateSettings = useCallback(
    async (changes) => {
      const next = sanitizeSettings({ ...latestSettings.current, ...changes });
      latestSettings.current = next;
      setSettings(next);
      await storage.saveSettings(next).catch(() => {});
    },
    [storage],
  );

  const value = useMemo(
    () => ({ settings, updateSettings, storage, dictionary, loadDictionary, fragments }),
    [settings, updateSettings, storage, dictionary, loadDictionary],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp must be used inside AppProvider');
  return value;
}
