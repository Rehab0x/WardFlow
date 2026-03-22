import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { templateService, type TemplateField } from '@/services/templateService';
import type { Template } from '@/db/database';


interface TemplatePopupProps {
  open: boolean;
  onClose: () => void;
  field: TemplateField;
  fieldLabel: string;
  currentContent?: string;
  onApply: (content: string) => void;
}

export function TemplatePopup({
  open,
  onClose,
  field,
  fieldLabel,
  currentContent,
  onApply,
}: TemplatePopupProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open, field]);

  const loadTemplates = async () => {
    const result = await templateService.getByField(field);
    setTemplates(result);
  };

  const handleApply = (template: Template) => {
    onApply(template.content);
    onClose();
  };

  const handleSaveNew = async () => {
    if (!newName.trim() || !newContent.trim()) return;
    setSaving(true);
    await templateService.add(field, newName.trim(), newContent.trim());
    setNewName('');
    setNewContent('');
    setShowAddForm(false);
    setSaving(false);
    await loadTemplates();
  };

  const handleDelete = async (id: string) => {
    await templateService.delete(id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const handleShowAddForm = () => {
    setNewName('');
    setNewContent(currentContent || '');
    setShowAddForm(true);
  };

  const fieldTemplates = templates.filter((t) => t.field === field);
  const globalTemplates = templates.filter((t) => t.field === 'global');

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            템플릿 — {fieldLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Field-specific templates */}
          {fieldTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {fieldLabel} 전용
              </p>
              {fieldTemplates.map((t) => (
                <TemplateItem
                  key={t.id}
                  template={t}
                  onApply={handleApply}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}

          {/* Global templates */}
          {globalTemplates.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                <Globe className="h-3 w-3" />
                전체 공통
              </p>
              {globalTemplates.map((t) => (
                <TemplateItem
                  key={t.id}
                  template={t}
                  onApply={handleApply}
                  onDelete={handleDelete}
                  isGlobal
                />
              ))}
            </div>
          )}

          {fieldTemplates.length === 0 && globalTemplates.length === 0 && !showAddForm && (
            <p className="text-sm text-muted-foreground text-center py-6">
              저장된 템플릿이 없습니다.
              <br />
              아래 버튼으로 새 템플릿을 추가해보세요.
            </p>
          )}

          {/* Add form */}
          {showAddForm && (
            <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <p className="text-sm font-medium">새 템플릿 추가</p>
              <div className="space-y-1.5">
                <Label className="text-xs">템플릿 이름</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="예: 정상 신체검사, 기본 ROS"
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">내용</Label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="템플릿 내용..."
                  className="w-full min-h-[80px] text-sm rounded-md border border-input bg-background px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(false)}
                >
                  취소
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveNew}
                  disabled={saving || !newName.trim() || !newContent.trim()}
                >
                  저장
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!showAddForm && (
          <div className="border-t pt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShowAddForm}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              {currentContent?.trim() ? '현재 내용으로 저장' : '새 템플릿 추가'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TemplateItem({
  template,
  onApply,
  onDelete,
  isGlobal = false,
}: {
  template: Template;
  onApply: (t: Template) => void;
  onDelete: (id: string) => void;
  isGlobal?: boolean;
}) {
  return (
    <div className="border rounded-lg p-3 hover:bg-muted/40 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-sm font-medium truncate">{template.name}</span>
            {isGlobal && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">공통</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {template.content}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            onClick={() => onApply(template)}
          >
            적용
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(template.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
