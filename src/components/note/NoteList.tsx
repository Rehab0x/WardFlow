import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Filter } from 'lucide-react';
import type { Note } from '@/db/database';
import { formatDate } from '@/utils/dateUtils';

interface NoteListProps {
  notes: Note[];
  onAdd?: () => void;
  onEdit?: (note: Note) => void;
  onDelete?: (noteId: string) => void;
}

export function NoteList({ notes, onAdd, onEdit, onDelete }: NoteListProps) {
  const [selectedType, setSelectedType] = useState<'all' | 'progress' | 'reminder'>('all');

  // Filter notes by type
  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const typeMatch = selectedType === 'all' || note.type === selectedType;
      return typeMatch;
    });
  }, [notes, selectedType]);

  const getNoteTypeLabel = (type: Note['type']) => {
    const labels = {
      progress: '경과 기록',
      reminder: '알림',
    };
    return labels[type];
  };

  const getNoteTypeColor = (type: Note['type']) => {
    const colors = {
      progress: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      reminder: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[type];
  };

  const handleDelete = (noteId: string, noteContent: string) => {
    const preview = noteContent.length > 30 ? `${noteContent.slice(0, 30)}...` : noteContent;
    if (window.confirm(`"${preview}"\n이 메모를 삭제하시겠습니까?`)) {
      onDelete?.(noteId);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">메모 ({filteredNotes.length})</h3>
        {onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-2" />
            새 메모
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
            className="h-7 text-xs"
          >
            전체
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'progress' ? 'default' : 'outline'}
            onClick={() => setSelectedType('progress')}
            className="h-7 text-xs"
          >
            경과 기록
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'reminder' ? 'default' : 'outline'}
            onClick={() => setSelectedType('reminder')}
            className="h-7 text-xs"
          >
            알림
          </Button>
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {selectedType === 'all'
              ? '작성된 메모가 없습니다.'
              : '필터 조건에 맞는 메모가 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`text-xs ${getNoteTypeColor(note.type)}`}>
                    {getNoteTypeLabel(note.type)}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(note.createdAt)}
                  </span>
                  {note.alertDate && (
                    <Badge variant="outline" className="text-xs">
                      알림: {formatDate(note.alertDate)}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {onEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={() => onEdit(note)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(note.id, note.content)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Content */}
              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
