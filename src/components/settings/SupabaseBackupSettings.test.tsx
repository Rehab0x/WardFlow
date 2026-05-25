import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createSupabaseBackupSnapshot,
  deleteSupabaseBackupSnapshot,
  listSupabaseBackupSnapshots,
  previewSupabaseBackupSnapshot,
} from '@/services/backupSnapshotService';
import { SupabaseBackupSettings } from './SupabaseBackupSettings';
import type { BackupSnapshotSummary } from '@/data/backupSnapshots.repository';

const mockCurrentUser = vi.hoisted(() => ({ id: 'admin-1', name: '관리자' }));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    currentUser: mockCurrentUser,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock('@/services/backupSnapshotService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/backupSnapshotService')>();
  return {
    ...actual,
    createSupabaseBackupSnapshot: vi.fn(),
    deleteSupabaseBackupSnapshot: vi.fn(),
    listSupabaseBackupSnapshots: vi.fn(),
    previewSupabaseBackupSnapshot: vi.fn(),
  };
});

const snapshot: BackupSnapshotSummary = {
  id: 'snapshot-1',
  kind: 'manual',
  createdAt: new Date('2026-05-25T03:00:00+09:00'),
  recordCounts: {
    patients: 2,
    notes: 3,
    schedules: 1,
    labResults: 1,
  },
};

const createdSnapshot: BackupSnapshotSummary = {
  ...snapshot,
  id: 'snapshot-2',
  createdAt: new Date('2026-05-25T04:00:00+09:00'),
};

describe('SupabaseBackupSettings', () => {
  beforeEach(() => {
    vi.mocked(createSupabaseBackupSnapshot).mockReset();
    vi.mocked(deleteSupabaseBackupSnapshot).mockReset();
    vi.mocked(listSupabaseBackupSnapshots).mockReset();
    vi.mocked(previewSupabaseBackupSnapshot).mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('loads snapshots and renders restore preview impacts', async () => {
    const user = userEvent.setup();
    vi.mocked(listSupabaseBackupSnapshots).mockResolvedValue([snapshot]);
    vi.mocked(previewSupabaseBackupSnapshot).mockResolvedValue({
      createdAt: snapshot.createdAt,
      recordCounts: {
        patients: 2,
        notes: 3,
        schedules: 1,
        medications: 0,
        labResults: 1,
        labItems: 2,
        templates: 0,
        labCategories: 0,
        userSettings: 1,
      },
      currentCounts: {
        patients: 3,
        notes: 3,
        schedules: 1,
        medications: 0,
        labResults: 1,
        labItems: 2,
        templates: 0,
        labCategories: 0,
        userSettings: 1,
      },
      restoreCheck: {
        blocked: false,
        warnings: ['환자 수가 현재 서버보다 적습니다.'],
        summary: '복원 전에 현재 서버와 스냅샷의 데이터 차이를 확인해야 합니다.',
        impacts: [
          {
            key: 'patients',
            label: '환자',
            snapshotCount: 2,
            currentCount: 3,
            delta: -1,
            level: 'warning',
            message: '환자 1개가 현재 서버보다 적습니다.',
          },
        ],
      },
    });

    render(<SupabaseBackupSettings />);

    expect(await screen.findByText(/선택됨:/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('스냅샷 미리보기 비밀번호'), 'pass1234');
    await waitFor(() => expect(screen.getByRole('button', { name: '미리보기' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '미리보기' }));

    await waitFor(() =>
      expect(previewSupabaseBackupSnapshot).toHaveBeenCalledWith({
        snapshotId: 'snapshot-1',
        password: 'pass1234',
      })
    );
    expect(screen.getByText('환자 1개가 현재 서버보다 적습니다.')).toBeInTheDocument();
    expect(
      screen.getByText('복원 전에 현재 서버와 스냅샷의 데이터 차이를 확인해야 합니다.')
    ).toBeInTheDocument();
  });

  it('creates a snapshot with the current user and selects it', async () => {
    const user = userEvent.setup();
    vi.mocked(listSupabaseBackupSnapshots).mockResolvedValue([]);
    vi.mocked(createSupabaseBackupSnapshot).mockResolvedValue(createdSnapshot);

    render(<SupabaseBackupSettings />);

    expect(await screen.findByText('아직 저장된 스냅샷이 없습니다.')).toBeInTheDocument();
    await user.type(screen.getByLabelText('스냅샷 암호화 비밀번호'), ' pass1234 ');
    await waitFor(() => expect(screen.getByRole('button', { name: '스냅샷 생성' })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: '스냅샷 생성' }));

    await waitFor(() =>
      expect(createSupabaseBackupSnapshot).toHaveBeenCalledWith({
        ownerId: 'admin-1',
        password: ' pass1234 ',
      })
    );
    await waitFor(() =>
      expect(screen.getByLabelText('미리보기할 스냅샷')).toHaveValue('snapshot-2')
    );
  });

  it('deletes the selected snapshot and clears the preview password', async () => {
    const user = userEvent.setup();
    vi.mocked(listSupabaseBackupSnapshots).mockResolvedValue([snapshot]);
    vi.mocked(deleteSupabaseBackupSnapshot).mockResolvedValue(undefined);

    render(<SupabaseBackupSettings />);

    expect(await screen.findByText(/선택됨:/)).toBeInTheDocument();
    await user.type(screen.getByLabelText('스냅샷 미리보기 비밀번호'), 'pass1234');
    await user.click(screen.getByRole('button', { name: '삭제' }));

    await waitFor(() => expect(deleteSupabaseBackupSnapshot).toHaveBeenCalledWith('snapshot-1'));
    expect(screen.getByLabelText('스냅샷 미리보기 비밀번호')).toHaveValue('');
    await waitFor(() =>
      expect(screen.getByText('아직 저장된 스냅샷이 없습니다.')).toBeInTheDocument()
    );
  });
});
