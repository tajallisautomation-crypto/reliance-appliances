import { useState } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';

export default function AnnouncementBanner() {
  const { announcementEnabled, announcementText } = useSettingsStore();
  const [dismissed, setDismissed] = useState(false);

  if (!announcementEnabled || !announcementText.trim() || dismissed) return null;

  return (
    <div className="bg-brand-600 text-white text-sm py-2 px-4 flex items-center justify-center gap-3 relative">
      <span className="text-center leading-snug">{announcementText}</span>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-1/2 -translate-y-1/2 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
