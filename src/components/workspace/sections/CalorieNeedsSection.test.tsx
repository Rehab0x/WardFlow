import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Patient } from '@/types/patient';
import { CalorieNeedsSection } from './CalorieNeedsSection';

function patient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    name: '홍길동',
    // 만 70세가 되도록 넉넉히 잡는다 (테스트 실행 시점과 무관하게 70세)
    birthDate: new Date(new Date().getFullYear() - 70, 0, 1),
    sex: 'M',
    roomBed: '101',
    status: 'active',
    patientType: 'admitted',
    ...overrides,
  } as Patient;
}

async function turnOn() {
  await userEvent.click(screen.getByRole('switch', { name: '1일 필요열량 계산' }));
}

async function enterMeasurements(height: string, weight: string) {
  await userEvent.type(screen.getByLabelText('키 (cm)'), height);
  await userEvent.type(screen.getByLabelText('몸무게 (kg)'), weight);
}

describe('CalorieNeedsSection', () => {
  it('stays closed until the switch is turned on', async () => {
    render(<CalorieNeedsSection patient={patient()} />);

    expect(screen.getByRole('switch', { name: '1일 필요열량 계산' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByLabelText('키 (cm)')).not.toBeInTheDocument();

    await turnOn();
    expect(screen.getByLabelText('키 (cm)')).toBeInTheDocument();
  });

  it('calculates with the patient age and sex from the chart', async () => {
    render(<CalorieNeedsSection patient={patient()} />);
    await turnOn();
    await enterMeasurements('170', '65');

    // 남 70세 170cm 65kg → REE 1367.5, × 1.2(침상 생활) = 1641
    expect(screen.getByText('1,641')).toBeInTheDocument();
    expect(screen.getByText(/REE 1,368 kcal/)).toBeInTheDocument();
    expect(screen.getByText(/남 \/ 70세/)).toBeInTheDocument();
  });

  it('applies the chosen activity and injury factors', async () => {
    render(<CalorieNeedsSection patient={patient()} />);
    await turnOn();
    await enterMeasurements('170', '65');

    await userEvent.selectOptions(screen.getByLabelText('활동계수'), 'out-of-bed'); // 1.3
    await userEvent.selectOptions(screen.getByLabelText('상해·스트레스 계수'), 'fever'); // 1.3

    // 1367.5 × 1.3 × 1.3 = 2311
    expect(screen.getByText('2,311')).toBeInTheDocument();
  });

  it('flags when the adjusted body weight was used', async () => {
    render(<CalorieNeedsSection patient={patient()} />);
    await turnOn();
    await enterMeasurements('170', '100'); // BMI 34.6

    expect(screen.getByText(/보정체중 72.7 kg 적용/)).toBeInTheDocument();
  });

  it('shows the working when asked', async () => {
    render(<CalorieNeedsSection patient={patient()} />);
    await turnOn();
    await enterMeasurements('170', '65');

    expect(screen.queryByText(/REE = 10 ×/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '계산 근거' }));

    expect(screen.getByText(/REE = 10 × 65/)).toBeInTheDocument();
    // 계수 표도 같이 펼쳐진다
    expect(screen.getByText('기계환기 / 완전 침상')).toBeInTheDocument();
    expect(screen.getByText('중증 화상')).toBeInTheDocument();
  });

  it('refuses obviously mistyped measurements', async () => {
    render(<CalorieNeedsSection patient={patient()} />);
    await turnOn();
    await enterMeasurements('17', '65'); // 170 오타

    expect(screen.getByText(/키와 몸무게를 확인해주세요/)).toBeInTheDocument();
  });

  it('does not carry one patient measurements over to the next', async () => {
    const { rerender } = render(
      <CalorieNeedsSection
        patient={patient({ nutritionEnabled: true, heightCm: 170, weightKg: 65 })}
      />
    );
    expect(screen.getByLabelText('키 (cm)')).toHaveValue(170);

    rerender(<CalorieNeedsSection patient={patient({ id: 'p2', name: '성춘향', sex: 'F' })} />);

    expect(screen.getByRole('switch', { name: '1일 필요열량 계산' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
    expect(screen.queryByLabelText('키 (cm)')).not.toBeInTheDocument();
  });

  it('opens with what was saved for this patient', () => {
    render(
      <CalorieNeedsSection
        patient={patient({
          nutritionEnabled: true,
          heightCm: 170,
          weightKg: 65,
          nutritionActivityFactorId: 'out-of-bed',
          nutritionInjuryFactorId: 'fever',
        })}
      />
    );

    expect(screen.getByLabelText('키 (cm)')).toHaveValue(170);
    expect(screen.getByLabelText('몸무게 (kg)')).toHaveValue(65);
    expect(screen.getByLabelText('활동계수')).toHaveValue('out-of-bed');
    // 1367.5 × 1.3 × 1.3 = 2311
    expect(screen.getByText('2,311')).toBeInTheDocument();
  });

  it('saves the measurements and the switch state together', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CalorieNeedsSection patient={patient()} onSave={onSave} />);

    await turnOn();
    await enterMeasurements('170', '65');
    await userEvent.selectOptions(screen.getByLabelText('상해·스트레스 계수'), 'sepsis-mid');
    await userEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(onSave).toHaveBeenCalledWith({
      heightCm: 170,
      weightKg: 65,
      nutritionEnabled: true,
      nutritionActivityFactorId: 'bedridden',
      nutritionInjuryFactorId: 'sepsis-mid',
    });
  });

  it('keeps the save button quiet until something changes', async () => {
    const onSave = vi.fn();
    render(
      <CalorieNeedsSection
        patient={patient({ nutritionEnabled: true, heightCm: 170, weightKg: 65 })}
        onSave={onSave}
      />
    );

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByText('저장됨')).toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText('몸무게 (kg)'));
    await userEvent.type(screen.getByLabelText('몸무게 (kg)'), '70');

    expect(screen.getByText('미저장')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '저장' })).toBeEnabled();
  });
});
