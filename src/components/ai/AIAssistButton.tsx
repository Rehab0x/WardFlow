import { useState } from 'react';
import { Bot, Copy, Check, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAIStore } from '@/stores/useAIStore';
import { generateSOAP, generateLabSummary, generateHandoff, checkMedications } from '@/services/aiService';
import { useToast } from '@/hooks/use-toast';

/**
 * Parse SOAP text into individual sections.
 * Matches patterns like "S)", "S.", "S:", "Subjective)", etc.
 */
function parseSOAP(text: string): Record<'S' | 'O' | 'A' | 'P', string> {
  const result: Record<'S' | 'O' | 'A' | 'P', string> = { S: '', O: '', A: '', P: '' };
  const keys: Array<'S' | 'O' | 'A' | 'P'> = ['S', 'O', 'A', 'P'];

  // Try to split by section headers
  // Match: S) / S. / S: / S - / Subjective) / Subjective: etc.
  const sectionRegex = /^(S|O|A|P|Subjective|Objective|Assessment|Plan)\s*[).::\-]\s*/im;

  const lines = text.split('\n');
  let currentKey: 'S' | 'O' | 'A' | 'P' | null = null;

  for (const line of lines) {
    const match = line.match(sectionRegex);
    if (match) {
      const letter = match[1]!.charAt(0).toUpperCase() as 'S' | 'O' | 'A' | 'P';
      if (keys.includes(letter)) {
        currentKey = letter;
        // Remove the section header and any trailing title words
        let content = line.replace(sectionRegex, '').trim();
        // Strip "Subjective", "Objective", "Assessment", "Plan" and common separators
        content = content.replace(/^(Subjective|Objective|Assessment|Plan)\s*[—\-:.]?\s*/i, '').trim();
        if (content) result[currentKey] += (result[currentKey] ? '\n' : '') + content;
        continue;
      }
    }
    if (currentKey) {
      result[currentKey] += (result[currentKey] ? '\n' : '') + line;
    }
  }

  // Trim all
  for (const k of keys) {
    result[k] = result[k].trim();
  }

  return result;
}

interface AISOAPButtonProps {
  patientName: string;
  chiefComplaint: string;
  onset: string;
  progressNote: string;
  currentMedications?: string;
  recentLab?: string;
}

export function AISOAPButton(props: AISOAPButtonProps) {
  const { isConfigured } = useAIStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isConfigured()) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const soap = await generateSOAP(props);
      setResult(soap);
    } catch (err) {
      toast({ title: 'AI 오류', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Parse SOAP sections from result
  const soapSections = result ? parseSOAP(result) : null;

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: 'SOAP 전체 복사 완료' });
    setTimeout(() => setCopied(false), 2000);
  };

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const handleCopySection = async (key: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(key);
    toast({ title: `${key}) 복사 완료` });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading || !props.progressNote.trim()}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />SOAP 생성 중...</>
        ) : (
          <><Bot className="h-3.5 w-3.5" />AI SOAP 변환</>
        )}
      </Button>

      {result && soapSections && (
        <Card className="p-3 bg-muted/30 relative space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-primary">AI SOAP 결과</span>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 gap-1" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                전체
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Individual SOAP sections */}
          {(['S', 'O', 'A', 'P'] as const).map((key) => {
            const content = soapSections[key];
            if (!content) return null;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary">{key})</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 text-[10px] px-1.5 gap-0.5"
                    onClick={() => handleCopySection(key, content)}
                  >
                    {copiedSection === key ? <Check className="h-2.5 w-2.5 text-green-600" /> : <Copy className="h-2.5 w-2.5" />}
                    복사
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground pl-3 border-l-2 border-primary/20">{content}</pre>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}

interface AILabSummaryButtonProps {
  patientName: string;
  chiefComplaint: string;
  labData: string;
}

export function AILabSummaryButton(props: AILabSummaryButtonProps) {
  const { isConfigured } = useAIStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isConfigured()) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const summary = await generateLabSummary(props);
      setResult(summary);
    } catch (err) {
      toast({ title: 'AI 오류', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: 'Lab 요약 복사 완료' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading || !props.labData.trim()}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />Lab 요약 중...</>
        ) : (
          <><Bot className="h-3.5 w-3.5" />AI Lab 요약</>
        )}
      </Button>

      {result && (
        <Card className="p-3 bg-muted/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary">AI Lab 요약</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{result}</pre>
        </Card>
      )}
    </div>
  );
}

// ─── Handoff Button ───

interface AIHandoffButtonProps {
  patientName: string;
  sex: string;
  age: number;
  admissionDate: string;
  chiefComplaint: string;
  onset: string;
  problemList: string;
  currentMedications: string;
  antibiotics: string;
  recentLab: string;
  recentNotes: string;
  tags: string;
  attention: boolean;
  schedules: string;
}

export function AIHandoffButton(props: AIHandoffButtonProps) {
  const { isConfigured } = useAIStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isConfigured()) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const summary = await generateHandoff(props);
      setResult(summary);
    } catch (err) {
      toast({ title: 'AI 오류', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: '인수인계 복사 완료' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />인수인계 생성 중...</>
        ) : (
          <><Bot className="h-3.5 w-3.5" />인수인계 요약</>
        )}
      </Button>

      {result && (
        <Card className="p-3 bg-muted/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary">인수인계 요약</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{result}</pre>
        </Card>
      )}
    </div>
  );
}

// ─── Medication Check Button ───

interface AIMedCheckButtonProps {
  patientName: string;
  age: number;
  sex: string;
  currentMedications: string;
  antibiotics: string;
  recentLab: string;
}

export function AIMedCheckButton(props: AIMedCheckButtonProps) {
  const { isConfigured } = useAIStore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isConfigured()) return null;

  const handleGenerate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const check = await checkMedications(props);
      setResult(check);
    } catch (err) {
      toast({ title: 'AI 오류', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    toast({ title: '투약 체크 복사 완료' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleGenerate}
        disabled={loading || !props.currentMedications.trim()}
        className="gap-1.5"
      >
        {loading ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" />투약 체크 중...</>
        ) : (
          <><Bot className="h-3.5 w-3.5" />투약 체크</>
        )}
      </Button>

      {result && (
        <Card className="p-3 bg-muted/30 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-primary">투약 안전성 체크</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCopy}>
                {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setResult(null)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <pre className="text-xs whitespace-pre-wrap font-mono text-muted-foreground">{result}</pre>
        </Card>
      )}
    </div>
  );
}
