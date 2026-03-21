// ── Spec Comparison Engine ────────────────────────────────────────────────────

import type { Product } from './api';

// ── Per-category spec schema ───────────────────────────────────────────────────
// key:       the exact key used in product.specs
// label:     human display
// highlight: 'min' = lower is better, 'max' = higher is better
export interface SpecField {
  key:        string;
  label:      string;
  unit?:      string;
  highlight?: 'min' | 'max';
}

export const SPEC_SCHEMA: Record<string, SpecField[]> = {
  'Air Conditioners': [
    { key: 'Capacity',           label: 'Capacity (Ton)'                                          },
    { key: 'Cooling Capacity',   label: 'Cooling Capacity',   unit: 'BTU',  highlight: 'max'      },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Inverter',           label: 'Inverter Technology'                                      },
    { key: 'Compressor',         label: 'Compressor Type'                                         },
    { key: 'Coverage Area',      label: 'Coverage Area',      unit: 'sq ft',highlight: 'max'      },
    { key: 'Energy Rating',      label: 'Energy Rating'                                           },
    { key: 'Energy Class',       label: 'Energy Class'                                            },
    { key: 'Gas Type',           label: 'Refrigerant Gas'                                         },
    { key: 'Noise Level',        label: 'Noise Level',        unit: 'dB',   highlight: 'min'      },
    { key: 'Heating',            label: 'Heating Mode'                                            },
    { key: 'Auto Restart',       label: 'Auto Restart'                                            },
    { key: 'Turbo Mode',         label: 'Turbo / Fast Cool'                                       },
    { key: 'Sleep Mode',         label: 'Sleep Mode'                                              },
    { key: 'Self Cleaning',      label: 'Self Cleaning'                                           },
    { key: 'Air Purifier',       label: 'Air Purification'                                        },
    { key: 'WiFi',               label: 'Wi-Fi / App Control'                                     },
    { key: 'Dimensions',         label: 'Indoor Unit Dimensions'                                  },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Refrigerators': [
    { key: 'Capacity',           label: 'Capacity',           unit: 'Cu.Ft',highlight: 'max'      },
    { key: 'Type',               label: 'Door Type'                                               },
    { key: 'Compressor',         label: 'Compressor'                                              },
    { key: 'Inverter',           label: 'Inverter'                                                },
    { key: 'Cooling System',     label: 'Cooling System'                                          },
    { key: 'Defrost',            label: 'Defrost Type'                                            },
    { key: 'Gas Type',           label: 'Refrigerant Gas'                                         },
    { key: 'Energy Class',       label: 'Energy Class'                                            },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Freezer Capacity',   label: 'Freezer Capacity'                                        },
    { key: 'Fresh Zone',         label: 'Fresh Zone / VCM'                                        },
    { key: 'Door Alarm',         label: 'Door Alarm'                                              },
    { key: 'Child Lock',         label: 'Child Lock'                                              },
    { key: 'Display',            label: 'Display / Control'                                       },
    { key: 'Color',              label: 'Color / Finish'                                          },
    { key: 'Dimensions',         label: 'Dimensions (H×W×D)'                                      },
    { key: 'Net Weight',         label: 'Net Weight',         unit: 'kg'                          },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Freezer': [
    { key: 'Capacity',           label: 'Capacity',           unit: 'Cu.Ft',highlight: 'max'      },
    { key: 'Type',               label: 'Type'                                                    },
    { key: 'Compressor',         label: 'Compressor'                                              },
    { key: 'Inverter',           label: 'Inverter'                                                },
    { key: 'Gas Type',           label: 'Refrigerant Gas'                                         },
    { key: 'Energy Class',       label: 'Energy Class'                                            },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Temperature Range',  label: 'Temperature Range'                                       },
    { key: 'Baskets',            label: 'Baskets / Drawers'                                       },
    { key: 'Dimensions',         label: 'Dimensions (H×W×D)'                                      },
    { key: 'Net Weight',         label: 'Net Weight',         unit: 'kg'                          },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Washing Machines': [
    { key: 'Capacity',           label: 'Capacity',           unit: 'kg',   highlight: 'max'      },
    { key: 'Type',               label: 'Machine Type'                                            },
    { key: 'RPM',                label: 'Spin Speed',         unit: 'RPM',  highlight: 'max'      },
    { key: 'Programs',           label: 'Wash Programs'                                           },
    { key: 'Temperature Control',label: 'Temperature Control'                                     },
    { key: 'Water Consumption',  label: 'Water Consumption',  unit: 'L',    highlight: 'min'      },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Drum Material',      label: 'Drum Material'                                           },
    { key: 'Control',            label: 'Control Type'                                            },
    { key: 'Display',            label: 'Display'                                                 },
    { key: 'Child Lock',         label: 'Child Lock'                                              },
    { key: 'Delay Start',        label: 'Delay Start'                                             },
    { key: 'Auto Restart',       label: 'Auto Restart'                                            },
    { key: 'Inverter',           label: 'Inverter Motor'                                          },
    { key: 'Energy Class',       label: 'Energy Class'                                            },
    { key: 'Connectivity',       label: 'Wi-Fi / App'                                             },
    { key: 'Noise Level',        label: 'Noise Level',        unit: 'dB',   highlight: 'min'      },
    { key: 'Dimensions',         label: 'Dimensions (H×W×D)'                                      },
    { key: 'Net Weight',         label: 'Net Weight',         unit: 'kg'                          },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Televisions': [
    { key: 'Screen Size',        label: 'Screen Size',        unit: '"',    highlight: 'max'      },
    { key: 'Resolution',         label: 'Resolution'                                              },
    { key: 'Panel Type',         label: 'Panel Type'                                              },
    { key: 'Display Type',       label: 'Display Technology'                                      },
    { key: 'Refresh Rate',       label: 'Refresh Rate',       unit: 'Hz',   highlight: 'max'      },
    { key: 'HDR',                label: 'HDR Support'                                             },
    { key: 'Smart TV',           label: 'Smart TV'                                                },
    { key: 'OS',                 label: 'Operating System'                                        },
    { key: 'Processor',          label: 'Processor'                                               },
    { key: 'RAM',                label: 'RAM',                unit: 'GB',   highlight: 'max'      },
    { key: 'Storage',            label: 'Storage',            unit: 'GB',   highlight: 'max'      },
    { key: 'Sound Output',       label: 'Sound Output',       unit: 'W',    highlight: 'max'      },
    { key: 'Dolby',              label: 'Dolby Audio'                                             },
    { key: 'Ports',              label: 'Ports / Connectivity'                                    },
    { key: 'HDMI',               label: 'HDMI Ports',                       highlight: 'max'      },
    { key: 'USB',                label: 'USB Ports',                        highlight: 'max'      },
    { key: 'Bluetooth',          label: 'Bluetooth'                                               },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Dimensions',         label: 'Dimensions (W×H×D)'                                      },
    { key: 'Net Weight',         label: 'Net Weight',         unit: 'kg'                          },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Solar Solutions': [
    { key: 'Wattage',            label: 'Wattage',            unit: 'W',    highlight: 'max'      },
    { key: 'Type',               label: 'Type'                                                    },
    { key: 'Technology',         label: 'Technology'                                              },
    { key: 'Efficiency',         label: 'Efficiency',         unit: '%',    highlight: 'max'      },
    { key: 'Capacity (AH)',      label: 'Battery Capacity',   unit: 'AH',   highlight: 'max'      },
    { key: 'Capacity (kWh)',     label: 'Energy Capacity',    unit: 'kWh',  highlight: 'max'      },
    { key: 'Backup Time',        label: 'Backup Time',        unit: 'hrs',  highlight: 'max'      },
    { key: 'Cycle Life',         label: 'Cycle Life'                                              },
    { key: 'Deep Discharge',     label: 'Deep Discharge Safe'                                     },
    { key: 'Maintenance',        label: 'Maintenance'                                             },
    { key: 'Dimensions',         label: 'Dimensions'                                              },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Air Fryers': [
    { key: 'Capacity',           label: 'Capacity',           unit: 'L',    highlight: 'max'      },
    { key: 'Power',              label: 'Power',              unit: 'W',    highlight: 'max'      },
    { key: 'Temperature Range',  label: 'Temperature Range',  unit: '°C'                          },
    { key: 'Timer',              label: 'Timer'                                                   },
    { key: 'Basket Type',        label: 'Basket Type'                                             },
    { key: 'Display',            label: 'Display'                                                 },
    { key: 'Control',            label: 'Control Type'                                            },
    { key: 'Preset Programs',    label: 'Preset Programs'                                         },
    { key: 'Safety',             label: 'Safety Features'                                         },
    { key: 'Dimensions',         label: 'Dimensions'                                              },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Kitchen Appliances': [
    { key: 'Capacity',           label: 'Capacity',                          highlight: 'max'      },
    { key: 'Power',              label: 'Power',              unit: 'W',    highlight: 'max'      },
    { key: 'Temperature Range',  label: 'Temperature Range'                                       },
    { key: 'Timer',              label: 'Timer'                                                   },
    { key: 'Speed Settings',     label: 'Speed Settings'                                          },
    { key: 'Material',           label: 'Material'                                                },
    { key: 'Bowl Material',      label: 'Bowl / Jar Material'                                     },
    { key: 'Control',            label: 'Control Type'                                            },
    { key: 'Safety',             label: 'Safety Features'                                         },
    { key: 'Dimensions',         label: 'Dimensions'                                              },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Small Appliances': [
    { key: 'Capacity',           label: 'Capacity',                          highlight: 'max'      },
    { key: 'Power',              label: 'Power',              unit: 'W',    highlight: 'max'      },
    { key: 'Type',               label: 'Type'                                                    },
    { key: 'Material',           label: 'Material'                                                },
    { key: 'Control',            label: 'Control Type'                                            },
    { key: 'Safety',             label: 'Safety Features'                                         },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Water Dispensers': [
    { key: 'Type',               label: 'Type'                                                    },
    { key: 'Compressor',         label: 'Compressor'                                              },
    { key: 'Hot Temperature',    label: 'Hot Water Temp',     unit: '°C'                          },
    { key: 'Cold Temperature',   label: 'Cold Water Temp',    unit: '°C'                          },
    { key: 'Power Consumption',  label: 'Power Consumption',  unit: 'W',    highlight: 'min'      },
    { key: 'Child Lock',         label: 'Child Lock (Hot)'                                        },
    { key: 'Bottle Capacity',    label: 'Bottle Capacity',    unit: 'Gal'                         },
    { key: 'Material',           label: 'Body Material'                                           },
    { key: 'Dimensions',         label: 'Dimensions'                                              },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
  'Vacuum Cleaners': [
    { key: 'Power',              label: 'Motor Power',        unit: 'W',    highlight: 'max'      },
    { key: 'Suction Power',      label: 'Suction Power',      unit: 'Pa',   highlight: 'max'      },
    { key: 'Capacity',           label: 'Dust Capacity',                     highlight: 'max'      },
    { key: 'Type',               label: 'Type'                                                    },
    { key: 'Filtration',         label: 'Filtration'                                              },
    { key: 'Cord Length',        label: 'Cord Length',        unit: 'm',    highlight: 'max'      },
    { key: 'Noise Level',        label: 'Noise Level',        unit: 'dB',   highlight: 'min'      },
    { key: 'Accessories',        label: 'Accessories / Attachments'                               },
    { key: 'Warranty',           label: 'Warranty',                          highlight: 'max'      },
  ],
};

// Fallback: generic fields used when no schema exists for a category
const GENERIC_FIELDS: SpecField[] = [
  { key: 'Capacity',          label: 'Capacity',          highlight: 'max' },
  { key: 'Power',             label: 'Power',             highlight: 'max' },
  { key: 'Power Consumption', label: 'Power Consumption', highlight: 'min' },
  { key: 'Type',              label: 'Type'                                },
  { key: 'Material',          label: 'Material'                            },
  { key: 'Control',           label: 'Control Type'                        },
  { key: 'Safety',            label: 'Safety Features'                     },
  { key: 'Dimensions',        label: 'Dimensions'                          },
  { key: 'Warranty',          label: 'Warranty',          highlight: 'max' },
];

// Category aliases — DB value → schema key
const CATEGORY_ALIAS: Record<string, string> = {
  'Freezers':           'Freezer',
  'Washing Machine':    'Washing Machines',
  'LED TV':             'Televisions',
  'Commercial AC':      'Air Conditioners',
};

/** Get the spec fields to use for a given category (or generic fallback). */
export function getSpecFields(category: string): SpecField[] {
  const key = CATEGORY_ALIAS[category] ?? category;
  return SPEC_SCHEMA[key] ?? GENERIC_FIELDS;
}

/** Get all unique spec fields across the given products.
 *  Always surfaces schema-defined fields first (in order), then any extra
 *  spec keys present in the actual product data that the schema doesn't cover. */
export function getMergedSpecFields(products: Product[]): SpecField[] {
  const cats = [...new Set(products.map(p => p.category))];

  const seen = new Set<string>();
  const fields: SpecField[] = [];

  // Schema fields for each category (in order)
  for (const cat of cats) {
    for (const f of getEffectiveSpecFields(cat)) {
      if (!seen.has(f.key)) { seen.add(f.key); fields.push(f); }
    }
  }

  // Any extra keys present in actual product.specs not covered by the schema
  for (const p of products) {
    for (const k of Object.keys(p.specs || {})) {
      if (!seen.has(k)) {
        seen.add(k);
        fields.push({ key: k, label: k });
      }
    }
  }

  return fields;
}

// ── Best-value highlighting ───────────────────────────────────────────────────

/** Parse numeric value from a spec string, e.g. "18000 BTU" → 18000. */
function parseNum(val: string): number | null {
  const m = val?.match(/[\d,]+(\.\d+)?/);
  if (!m) return null;
  return parseFloat(m[0].replace(/,/g, ''));
}

/** Returns the product IDs that have the "best" value for a given spec field. */
export function getBestIds(
  products: Product[],
  field: SpecField,
): Set<string> {
  if (!field.highlight) return new Set();
  const nums: { id: string; val: number }[] = [];
  for (const p of products) {
    const raw = p.specs?.[field.key];
    if (!raw) continue;
    const n = parseNum(raw);
    if (n !== null) nums.push({ id: p.id, val: n });
  }
  if (nums.length < 2) return new Set();
  const best = field.highlight === 'max'
    ? Math.max(...nums.map(n => n.val))
    : Math.min(...nums.map(n => n.val));
  return new Set(nums.filter(n => n.val === best).map(n => n.id));
}

/** True if a spec value indicates a positive feature (Yes, ✓, Inverter, etc.). */
export function isPositive(val: string): boolean {
  const lower = val?.toLowerCase().trim();
  return lower === 'yes' || lower === '✓' || lower === 'true' || lower === 'included';
}

/** True if a spec value indicates a negative feature (No, ✗, etc.). */
export function isNegative(val: string): boolean {
  const lower = val?.toLowerCase().trim();
  return lower === 'no' || lower === '✗' || lower === 'false' || lower === 'not included';
}

/** Highlight label e.g. "Best Energy Efficiency", "Largest Capacity". */
export function highlightLabel(field: SpecField): string {
  if (!field.highlight) return '';
  const k = field.label.toLowerCase();
  if (k.includes('power') || k.includes('consumption') || k.includes('noise'))
    return 'Best Efficiency';
  if (k.includes('capacity') || k.includes('size'))
    return field.highlight === 'max' ? 'Largest Capacity' : 'Smallest Capacity';
  if (k.includes('warranty')) return 'Best Warranty';
  if (k.includes('refresh')) return 'Smoothest Display';
  return field.highlight === 'max' ? 'Best Value' : 'Most Efficient';
}

// ── Custom spec schema (admin-editable, stored in localStorage) ───────────────
const CUSTOM_SCHEMA_KEY = 'tajalli_custom_spec_fields';

export function getCustomSpecFields(category: string): SpecField[] {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_SCHEMA_KEY) || '{}') as Record<string, SpecField[]>;
    return all[category] || [];
  } catch { return []; }
}

export function saveCustomSpecField(category: string, field: SpecField): void {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_SCHEMA_KEY) || '{}') as Record<string, SpecField[]>;
    const existing: SpecField[] = all[category] || [];
    if (!existing.some(f => f.key === field.key)) {
      all[category] = [...existing, field];
      localStorage.setItem(CUSTOM_SCHEMA_KEY, JSON.stringify(all));
    }
  } catch { /* ignore */ }
}

export function removeCustomSpecField(category: string, key: string): void {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_SCHEMA_KEY) || '{}') as Record<string, SpecField[]>;
    if (all[category]) {
      all[category] = all[category].filter(f => f.key !== key);
      localStorage.setItem(CUSTOM_SCHEMA_KEY, JSON.stringify(all));
    }
  } catch { /* ignore */ }
}

/** Get all spec fields for a category including admin-added custom fields. */
export function getEffectiveSpecFields(category: string): SpecField[] {
  const defaults = getSpecFields(category);
  const custom   = getCustomSpecFields(category);
  const seen     = new Set(defaults.map(f => f.key));
  return [...defaults, ...custom.filter(f => !seen.has(f.key))];
}

/** All unique category names that have a schema defined (default + custom). */
export function getAllSchemaCategories(): string[] {
  const cats = new Set(Object.keys(SPEC_SCHEMA));
  try {
    const custom = JSON.parse(localStorage.getItem(CUSTOM_SCHEMA_KEY) || '{}') as Record<string, SpecField[]>;
    Object.keys(custom).forEach(c => cats.add(c));
  } catch { /* ignore */ }
  return [...cats].sort();
}
