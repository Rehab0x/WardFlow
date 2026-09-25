/**
 * Culture 문장결과를 화면용 줄 단위로 나눈다 (순수 함수).
 *
 * 이원 XLS의 균 동정 결과는 한 칸에 이렇게 온다:
 *   "<Culture & ID>\nEscherichia coli\n<Sensitivity>\nAmikacin      S (2)\nAmpicillin    R (>=32) ..."
 * 줄바꿈 없이 한 줄로 이어져 와도 같은 모양으로 복구한다.
 * 모르는 줄은 버리지 않고 그대로 텍스트로 남긴다.
 */

export type SusceptibilityInterpretation = 'S' | 'I' | 'R';

export type CultureLine =
  | { kind: 'heading'; label: string; text: string }
  | {
      kind: 'susceptibility';
      drug: string;
      interpretation: SusceptibilityInterpretation;
      mic: string;
    }
  | { kind: 'text'; text: string };

const HEADING = /^<([^>]+)>\s*(.*)$/;
const SUSCEPTIBILITY = /^(.+?)\s+([SIR])(?:\s*\(([^)]*)\))?$/;
const SENSITIVITY_LABEL = /sensitiv|suscept|감수성/i;

function splitIntoLines(raw: string): string[] {
  return (
    raw
      .replace(/\r\n?/g, '\n')
      // 한 줄로 이어져 온 경우: 머리말 앞, "S (2)" 같은 판정 뒤에서 끊는다
      .replace(/\s*(<[^>\n]+>)/g, '\n$1')
      .replace(/(\s[SIR]\s*\([^)\n]*\))[ \t]+(?=\S)/g, '$1\n')
      .split('\n')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  );
}

function matchSusceptibility(line: string, inSensitivity: boolean): CultureLine | undefined {
  const matched = line.match(SUSCEPTIBILITY);
  if (!matched) return undefined;
  const mic = matched[3];
  // 감수성 구간 밖에서는 MIC 괄호까지 있어야 인정한다 — 균 이름을 판정으로 오인하지 않게
  if (!inSensitivity && mic === undefined) return undefined;
  return {
    kind: 'susceptibility',
    drug: matched[1]!,
    interpretation: matched[2] as SusceptibilityInterpretation,
    mic: mic?.trim() ?? '',
  };
}

export function parseCultureText(raw: string): CultureLine[] {
  const lines = splitIntoLines(raw);
  const result: CultureLine[] = [];
  let inSensitivity = false;

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const heading = line.match(HEADING);

    if (heading) {
      const label = heading[1]!.trim();
      inSensitivity = SENSITIVITY_LABEL.test(label);
      const rest = heading[2]!;
      const restAsSusceptibility = rest ? matchSusceptibility(rest, inSensitivity) : undefined;

      if (restAsSusceptibility) {
        result.push({ kind: 'heading', label, text: '' }, restAsSusceptibility);
        continue;
      }

      // "<Culture & ID>" 다음 줄의 균 이름은 머리말과 같은 줄에 붙인다
      const next = lines[index + 1];
      if (
        !rest &&
        !inSensitivity &&
        next !== undefined &&
        !HEADING.test(next) &&
        !matchSusceptibility(next, false)
      ) {
        result.push({ kind: 'heading', label, text: next });
        index++;
        continue;
      }

      result.push({ kind: 'heading', label, text: rest });
      continue;
    }

    result.push(matchSusceptibility(line, inSensitivity) ?? { kind: 'text', text: line });
  }

  return result;
}

/** "No growth of CRE"처럼 한 줄짜리 결과는 기존처럼 이름 옆에 붙여 보여준다. */
export function isCompactCultureResult(lines: CultureLine[]): boolean {
  return lines.length <= 1 && lines.every((line) => line.kind === 'text');
}
