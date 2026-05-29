'use client'

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', danger = false,
  onConfirm, onCancel,
}: {
  title: string; message: React.ReactNode; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className={`w-6 h-6 mt-0.5 shrink-0 ${danger ? 'text-red-500' : 'text-amber-500'}`} />
          <div>
            <h3 className="font-bold text-gray-900">{title}</h3>
            <div className="text-sm text-gray-500 mt-1 whitespace-pre-line">{message}</div>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm font-bold rounded-lg text-white ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'}`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
