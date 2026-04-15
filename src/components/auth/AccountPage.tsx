import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

const PROFILE_COLORS = [
  { name: '회색', value: '#6b7280' },
  { name: '빨강', value: '#ef4444' },
  { name: '주황', value: '#f97316' },
  { name: '노랑', value: '#eab308' },
  { name: '초록', value: '#22c55e' },
  { name: '파랑', value: '#3b82f6' },
  { name: '보라', value: '#8b5cf6' },
  { name: '분홍', value: '#ec4899' },
];

interface Props {
  onClose: () => void;
}

export default function AccountPage({ onClose }: Props) {
  const { profile, updateProfile, changePassword } = useAuthStore();

  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState('#6b7280');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setColor(profile.color);
    }
  }, [profile]);

  const handleProfileSave = async () => {
    if (!displayName.trim()) {
      setProfileMsg({ type: 'err', text: '이름을 입력해 주세요' });
      return;
    }
    setProfileLoading(true);
    setProfileMsg(null);
    const err = await updateProfile(displayName.trim(), color);
    if (err) setProfileMsg({ type: 'err', text: err });
    else setProfileMsg({ type: 'ok', text: '저장되었습니다' });
    setProfileLoading(false);
  };

  const handlePasswordChange = async () => {
    setPwMsg(null);
    if (newPassword.length < 6) {
      setPwMsg({ type: 'err', text: '비밀번호는 6자 이상이어야 합니다' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'err', text: '비밀번호가 일치하지 않습니다' });
      return;
    }
    setPwLoading(true);
    const err = await changePassword(newPassword);
    if (err) setPwMsg({ type: 'err', text: err });
    else {
      setPwMsg({ type: 'ok', text: '비밀번호가 변경되었습니다' });
      setNewPassword('');
      setConfirmPassword('');
    }
    setPwLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content overflow-x-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">계정 관리</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">✕</button>
        </div>

        {/* 프로필 섹션 */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">프로필</h3>

          <div className="flex items-center gap-3 mb-4">
            <span
              className="w-12 h-12 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <div className="min-w-0">
              <p className="font-medium">{displayName || '이름 없음'}</p>
              <p className="text-xs text-gray-400 truncate">@{profile?.username}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">이름</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="캘린더에 표시될 이름"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 block">프로필 색상</label>
              <div className="flex gap-2 flex-wrap">
                {PROFILE_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-9 h-9 rounded-full border-2 transition-transform ${
                      color === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>

            {profileMsg && (
              <p className={`text-xs ${profileMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {profileMsg.text}
              </p>
            )}

            <button
              onClick={handleProfileSave}
              disabled={profileLoading}
              className="btn-primary w-full disabled:opacity-50"
            >
              {profileLoading ? '저장 중...' : '프로필 저장'}
            </button>
          </div>
        </section>

        <hr className="border-gray-200 mb-6" />

        {/* 아이디 */}
        <section className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">아이디</h3>
          <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
            <p className="text-sm">@{profile?.username}</p>
            <p className="text-xs text-gray-400 mt-1">아이디는 변경할 수 없습니다</p>
          </div>
        </section>

        <hr className="border-gray-200 mb-6" />

        {/* 비밀번호 변경 */}
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">비밀번호 변경</h3>
          <div className="flex flex-col gap-3">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              placeholder="새 비밀번호 (6자 이상)"
              minLength={6}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              placeholder="새 비밀번호 확인"
              minLength={6}
            />

            {pwMsg && (
              <p className={`text-xs ${pwMsg.type === 'ok' ? 'text-green-600' : 'text-red-500'}`}>
                {pwMsg.text}
              </p>
            )}

            <button
              onClick={handlePasswordChange}
              disabled={pwLoading || !newPassword}
              className="btn-primary w-full disabled:opacity-50"
            >
              {pwLoading ? '변경 중...' : '비밀번호 변경'}
            </button>
          </div>
        </section>

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">닫기</button>
        </div>
      </div>
    </div>
  );
}
