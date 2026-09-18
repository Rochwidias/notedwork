import React from 'react';

export interface Note {
  id: string;
  title: string;
  body: string;
  pinned?: boolean;
}

export default function NotesView() {
  return (
    <div className="min-h-screen bg-[--bg] p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Notes</h1>
        <div className="bg-[--card] rounded-lg p-6 text-center">
          <p className="text-[--muted]">No notes yet. Click the + button to add one.</p>
        </div>
      </div>
    </div>
  );
}