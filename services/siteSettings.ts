import { supabase } from './supabase';

export interface SiteAsset {
  key: string;
  label: string;
  description: string;
  cropType: 'avatar' | 'banner';
  outputW: number;
  outputH: number;
}

export const SITE_ASSETS: SiteAsset[] = [
  {
    key: 'favicon',
    label: 'Sekme İkonu (Favicon)',
    description: 'Tarayıcı sekmesinde görünür · 64×64 · WebP',
    cropType: 'avatar',
    outputW: 64,
    outputH: 64,
  },
  {
    key: 'navbar_logo',
    label: 'Navbar Logosu',
    description: 'ANIPAL yazısının yanındaki görsel · 512×512 · WebP',
    cropType: 'avatar',
    outputW: 512,
    outputH: 512,
  },
];

const dataUrlToBlob = (dataUrl: string): Blob => {
  const [header, data] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] || 'image/webp';
  const bytes = atob(data);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
};

export const uploadSiteAsset = async (key: string, dataUrl: string): Promise<string> => {
  const blob = dataUrlToBlob(dataUrl);
  // Use timestamp so URL is unique every upload — no browser caching issue
  const path = `${key}-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from('site-assets')
    .upload(path, blob, { contentType: 'image/webp', upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data } = supabase.storage.from('site-assets').getPublicUrl(path);
  return data.publicUrl;
};

export const getSiteSettings = async (): Promise<Record<string, string>> => {
  try {
    const { data, error } = await supabase.from('site_settings').select('key, value');
    if (error || !data) return {};
    return Object.fromEntries(data.map((r: { key: string; value: string }) => [r.key, r.value]));
  } catch {
    return {};
  }
};

export const setSiteSetting = async (key: string, value: string): Promise<void> => {
  await supabase
    .from('site_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
};
