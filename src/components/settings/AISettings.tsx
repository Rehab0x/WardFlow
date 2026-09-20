import { useState } from 'react';
import { Bot, Eye, EyeOff, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { testConnection } from '@/services/aiService';
import { useAIStore, LLM_PROVIDERS, type LLMProvider } from '@/stores/useAIStore';
import { cn } from '@/utils/cn';

export function AISettings() {
  const {
    provider,
    apiKey,
    model,
    whisperApiKey,
    setProvider,
    setApiKey,
    setModel,
    setWhisperApiKey,
    isConfigured,
    isSttConfigured,
  } = useAIStore();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [showWhisperKey, setShowWhisperKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const providerInfo = LLM_PROVIDERS[provider];

  const test = async () => {
    if (!isConfigured()) {
      toast({ title: 'API Key를 먼저 입력해주세요.', variant: 'destructive' });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const result = await testConnection();
      setTestResult(result);
      toast({
        title: result.success ? '연결 성공' : '연결 실패',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message });
      toast({ title: '연결 테스트 실패', description: message, variant: 'destructive' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="space-y-4 p-4 sm:p-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">AI 설정</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        API Key는 이 기기에 저장됩니다. 환자 정보가 외부 API로 전송될 수 있으니 실제 사용 시
        주의하세요.
      </p>
      <div>
        <label className="mb-1.5 block text-sm font-medium">LLM 선택</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(LLM_PROVIDERS) as LLMProvider[]).map((item) => (
            <button
              key={item}
              onClick={() => setProvider(item)}
              aria-pressed={provider === item}
              className={cn(
                'rounded-md border px-3 py-2 text-sm transition-colors',
                provider === item
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {LLM_PROVIDERS[item].name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">모델</label>
        <select
          value={model}
          onChange={(event) => setModel(event.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {providerInfo.models.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} ({item.id})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">API Key</label>
        <div className="relative">
          <Input
            type={showKey ? 'text' : 'password'}
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder={`${providerInfo.name} API Key`}
            className="pr-10"
            autoComplete="off"
            spellCheck={false}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? 'API Key 숨기기' : 'API Key 표시'}
          >
            {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {apiKey ? `저장된 키 길이: ${apiKey.length}자` : 'API Key가 비어 있습니다.'}
        </p>
      </div>
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 p-3">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium">음성 질의 (Whisper)</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          회진 중 마이크로 질문하려면 OpenAI 키가 필요합니다. 위에서 고른 LLM과 무관한
          <strong> OpenAI 전용 키</strong>입니다. 음성과 변환된 텍스트는 저장하지 않습니다.
        </p>
        <div className="relative">
          <Input
            type={showWhisperKey ? 'text' : 'password'}
            value={whisperApiKey}
            onChange={(event) => setWhisperApiKey(event.target.value)}
            placeholder="OpenAI API Key (sk-...)"
            className="pr-10"
            autoComplete="off"
            spellCheck={false}
            aria-label="Whisper API Key"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 right-1 h-7 w-7 -translate-y-1/2"
            onClick={() => setShowWhisperKey(!showWhisperKey)}
            aria-label={showWhisperKey ? 'Whisper API Key 숨기기' : 'Whisper API Key 표시'}
          >
            {showWhisperKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isSttConfigured()
            ? '음성 질의 버튼이 활성화됩니다.'
            : '키를 입력하면 화면 우측 하단에 마이크 버튼이 나타납니다.'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={test} disabled={testing || !isConfigured()}>
          {testing ? '테스트 중...' : '연결 테스트'}
        </Button>
        {testResult && (
          <span
            className={cn('text-sm', testResult.success ? 'text-green-600' : 'text-destructive')}
          >
            {testResult.success ? '성공' : '실패'}: {testResult.message.slice(0, 80)}
          </span>
        )}
      </div>
    </Card>
  );
}
