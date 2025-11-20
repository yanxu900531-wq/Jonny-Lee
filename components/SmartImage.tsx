
import React, { useState, useEffect } from 'react';
import { generateIcon } from '../services/geminiService';
import { getCachedImage, cacheImage, clearLegacyStorage } from '../services/storageService';

interface SmartImageProps {
  prompt: string;
  cacheKey: string;
  alt: string;
  className?: string;
  fallbackEmoji: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ prompt, cacheKey, alt, className, fallbackEmoji }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        // 1. Try IndexedDB first (The new robust storage)
        const cachedDB = await getCachedImage(cacheKey);
        if (cachedDB && isMounted) {
          setImageUrl(cachedDB);
          return;
        }

        // 2. Check Legacy LocalStorage (Migration strategy)
        // If we find it here, we move it to IDB and delete from LocalStorage to fix the quota error
        const legacyKey = `icon_${cacheKey}`;
        const cachedLegacy = localStorage.getItem(legacyKey);
        
        if (cachedLegacy) {
          await cacheImage(cacheKey, cachedLegacy); // Move to DB
          clearLegacyStorage(cacheKey); // Free up space!
          if (isMounted) setImageUrl(cachedLegacy);
          return;
        }

        // 3. Generate New Image
        setLoading(true);
        
        // Small random delay to prevent rate limiting on initial load of multiple cards
        await new Promise(r => setTimeout(r, Math.random() * 1500));
        
        if (!isMounted) return;

        const url = await generateIcon(prompt);
        await cacheImage(cacheKey, url);
        
        if (isMounted) setImageUrl(url);

      } catch (e) {
        console.error("Failed to load icon for", cacheKey, e);
        // Fallback remains null, showing emoji
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    load();

    return () => {
      isMounted = false;
    };
  }, [cacheKey, prompt]);

  if (loading) {
    return <div className={`flex items-center justify-center bg-gray-100 animate-pulse ${className}`}>{fallbackEmoji}</div>;
  }

  if (!imageUrl) {
    return <div className={`flex items-center justify-center text-5xl bg-gray-50 ${className}`}>{fallbackEmoji}</div>;
  }

  return (
    <img src={imageUrl} alt={alt} className={`object-cover ${className}`} />
  );
};
