import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import type { Note } from '@/db/database';

interface NoteEditorProps {
  note?: Note; // If editing existing note
  patientId: string;
  onSave: (noteData: {
    content: string;
    type: 'progress' | 'reminder';
    date: string;
    alertDate?: string;
  }) => void;
  onCancel: () => void;
}

export function NoteEditor({ note, patientId: _patientId, onSave, onCancel }: NoteEditorProps) {
  const [content, setContent] = useState(note?.content || '');
  const [noteType, setNoteType] = useState<'progress' | 'reminder'>(
    note?.type || 'progress'
  );

  // Get today's date in YYYY-MM-DD format for default
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get tomorrow's date in YYYY-MM-DD format for default alertDate
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Initialize date: use note's createdAt if editing, otherwise today
  const [date, setDate] = useState<string>(() => {
    if (note?.createdAt) {
      const noteDate = note.createdAt instanceof Date ? note.createdAt : new Date(note.createdAt);
      const year = noteDate.getFullYear();
      const month = String(noteDate.getMonth() + 1).padStart(2, '0');
      const day = String(noteDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return getTodayDate();
  });

  // Initialize alertDate: use note's alertDate if editing, otherwise tomorrow
  const [alertDate, setAlertDate] = useState<string | undefined>(() => {
    if (note?.alertDate) {
      const alertDateObj = note.alertDate instanceof Date ? note.alertDate : new Date(note.alertDate);
      const year = alertDateObj.getFullYear();
      const month = String(alertDateObj.getMonth() + 1).padStart(2, '0');
      const day = String(alertDateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return note?.type === 'reminder' ? getTomorrowDate() : undefined;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      alert('메모 내용을 입력해주세요.');
      return;
    }

    if (noteType === 'reminder' && !alertDate) {
      alert('알림 날짜를 선택해주세요.');
      return;
    }

    onSave({
      content: content.trim(),
      type: noteType,
      date,
      alertDate: noteType === 'reminder' ? alertDate : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Note Type */}
      <div className="space-y-2">
        <Label>메모 유형</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={noteType === 'progress' ? 'default' : 'outline'}
            onClick={() => {
              setNoteType('progress');
              setAlertDate(undefined);
            }}
          >
            경과 기록
          </Button>
          <Button
            type="button"
            size="sm"
            variant={noteType === 'reminder' ? 'default' : 'outline'}
            onClick={() => {
              setNoteType('reminder');
              if (!alertDate) {
                setAlertDate(getTomorrowDate());
              }
            }}
          >
            알림
          </Button>
        </div>
      </div>

      {/* Date */}
      <div className="space-y-2">
        <Label htmlFor="date">날짜 *</Label>
        <Input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>

      {/* Alert Date (only for reminder type) */}
      {noteType === 'reminder' && (
        <div className="space-y-2">
          <Label htmlFor="alertDate">알림 날짜 *</Label>
          <Input
            id="alertDate"
            type="date"
            value={alertDate || ''}
            onChange={(e) => setAlertDate(e.target.value)}
            required
          />
        </div>
      )}

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content">내용 *</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="메모 내용을 입력하세요..."
          className="min-h-[120px]"
          required
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit">
          <Save className="h-4 w-4 mr-2" />
          {note ? '수정' : '저장'}
        </Button>
      </div>
    </form>
  );
}
