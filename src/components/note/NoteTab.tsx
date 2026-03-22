import { useState, useEffect } from 'react';
import { useNoteStore } from '@/stores/useNoteStore';
import { NoteEditor } from './NoteEditor';
import { NoteList } from './NoteList';
import type { Note } from '@/db/database';

interface NoteTabProps {
  patientId: string;
}

export function NoteTab({ patientId }: NoteTabProps) {
  const { notes, fetchNotesByPatient, addNote, updateNote, deleteNote } = useNoteStore();
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  useEffect(() => {
    if (patientId) {
      fetchNotesByPatient(patientId);
    }
  }, [patientId, fetchNotesByPatient]);

  const handleAddNote = async (noteData: {
    content: string;
    type: 'progress' | 'reminder';
    date: string;
    alertDate?: string;
  }) => {
    try {
      await addNote({
        patientId,
        ...noteData,
      });
      setShowAddNoteModal(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      alert('메모 추가에 실패했습니다.');
    }
  };

  const handleEditNote = async (noteData: {
    content: string;
    type: 'progress' | 'reminder';
    date: string;
    alertDate?: string;
  }) => {
    if (!editingNote) return;

    try {
      await updateNote(editingNote.id, noteData);
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to update note:', error);
      alert('메모 수정에 실패했습니다.');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('메모 삭제에 실패했습니다.');
    }
  };

  return (
    <>
      <div className="h-full overflow-y-auto p-3 sm:p-6">
        <NoteList
          notes={notes}
          onAdd={() => setShowAddNoteModal(true)}
          onEdit={setEditingNote}
          onDelete={handleDeleteNote}
        />
      </div>

      {/* Add Note Modal */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">새 메모 추가</h2>
              <NoteEditor
                patientId={patientId}
                onSave={handleAddNote}
                onCancel={() => setShowAddNoteModal(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4">메모 수정</h2>
              <NoteEditor
                note={editingNote}
                patientId={patientId}
                onSave={handleEditNote}
                onCancel={() => setEditingNote(null)}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
