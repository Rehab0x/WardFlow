import { useState } from 'react';
import { Bot, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { testConnection } from '@/services/aiService';
import { useAIStore, LLM_PROVIDERS, type LLMProvider } from '@/stores/useAIStore';
import { cn } from '@/utils/cn';

export function AISettings() {
  const { provider, apiKey, model, setProvider, setApiKey, setModel, isConfigured } = useAIStore();
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
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
