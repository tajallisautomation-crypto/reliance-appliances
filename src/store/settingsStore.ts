import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { setActivePlanRatios } from '@/lib/plans';

export interface SiteSettings {
  consultationThreshold: number;
  announcementText:      string;
  announcementEnabled:   boolean;
  plan2mMarkup:   number; plan2mAdvance:  number;
  plan3mMarkup:   number; plan3mAdvance:  number;
  plan6mMarkup:   number; plan6mAdvance:  number;
  plan12mMarkup:  number; plan12mAdvance: number;
}

export const SETTING_DEFAULTS: SiteSettings = {
  consultationThreshold: 200_000,
  announcementText:      '',
  announcementEnabled:   false,
  plan2mMarkup: 1.10,  plan2mAdvance: 0.50,
  plan3mMarkup: 1.15,  plan3mAdvance: 0.45,
  plan6mMarkup: 1.25,  plan6mAdvance: 0.40,
  plan12mMarkup: 1.40, plan12mAdvance: 0.30,
};

interface SettingsStore extends SiteSettings {
  loaded: boolean;
  load: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>(set => ({
  ...SETTING_DEFAULTS,
  loaded: false,

  load: async () => {
    const { data } = await supabase.from('site_settings').select('key, value');
    if (!data?.length) return;

    const m: Record<string, string> = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
    const n = (k: string, d: number) => (k in m ? Number(m[k]) : d);
    const b = (k: string, d: boolean) => (k in m ? m[k] === 'true' : d);

    const next: SiteSettings = {
      consultationThreshold: n('consultation_threshold', SETTING_DEFAULTS.consultationThreshold),
      announcementText:      m['announcement_text']    ?? SETTING_DEFAULTS.announcementText,
      announcementEnabled:   b('announcement_enabled',   SETTING_DEFAULTS.announcementEnabled),
      plan2mMarkup:   n('plan_2m_markup',   SETTING_DEFAULTS.plan2mMarkup),
      plan2mAdvance:  n('plan_2m_advance',  SETTING_DEFAULTS.plan2mAdvance),
      plan3mMarkup:   n('plan_3m_markup',   SETTING_DEFAULTS.plan3mMarkup),
      plan3mAdvance:  n('plan_3m_advance',  SETTING_DEFAULTS.plan3mAdvance),
      plan6mMarkup:   n('plan_6m_markup',   SETTING_DEFAULTS.plan6mMarkup),
      plan6mAdvance:  n('plan_6m_advance',  SETTING_DEFAULTS.plan6mAdvance),
      plan12mMarkup:  n('plan_12m_markup',  SETTING_DEFAULTS.plan12mMarkup),
      plan12mAdvance: n('plan_12m_advance', SETTING_DEFAULTS.plan12mAdvance),
    };

    // Push live plan ratios into plans.ts module for instant effect
    setActivePlanRatios({
      '2m':  { markup: next.plan2mMarkup,  advRatio: next.plan2mAdvance,  installments: 1  },
      '3m':  { markup: next.plan3mMarkup,  advRatio: next.plan3mAdvance,  installments: 2  },
      '6m':  { markup: next.plan6mMarkup,  advRatio: next.plan6mAdvance,  installments: 5  },
      '12m': { markup: next.plan12mMarkup, advRatio: next.plan12mAdvance, installments: 11 },
    });

    set({ ...next, loaded: true });
  },
}));
