import React, { createContext, useContext, useEffect, useState } from 'react';
import { getSiteSettings, setSiteSetting, uploadSiteAsset } from '../services/siteSettings';

interface SiteSettingsCtx {
  settings: Record<string, string>;
  uploadAndSave: (key: string, dataUrl: string) => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<SiteSettingsCtx>({
  settings: {},
  uploadAndSave: async () => {},
  loading: true,
});

export const useSiteSettings = () => useContext(Ctx);

const applySettings = (s: Record<string, string>) => {
  // Apply favicon dynamically
  if (s.favicon) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = s.favicon;
  }
};

export const SiteSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000); // fallback
    getSiteSettings()
      .then(s => {
        setSettings(s);
        applySettings(s);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });
  }, []);

  const uploadAndSave = async (key: string, dataUrl: string) => {
    const url = await uploadSiteAsset(key, dataUrl);
    await setSiteSetting(key, url);
    setSettings(prev => {
      const next = { ...prev, [key]: url };
      applySettings(next);
      return next;
    });
  };

  return <Ctx.Provider value={{ settings, uploadAndSave, loading }}>{children}</Ctx.Provider>;
};
