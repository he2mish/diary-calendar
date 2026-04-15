import { useState } from 'react';
import { useCalendarStore } from '../../stores/calendarStore';
import { useAuthStore } from '../../stores/authStore';

export default function SharePanel() {
  const { shares, pendingInvites, inviteUser, acceptInvite, removeShare } = useCalendarStore();
  const { user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const myShares = shares.filter((s) => s.ownerId === user?.id);
  const sharedWithMe = shares.filter((s) => s.ownerId !== user?.id && s.accepted);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const err = await inviteUser(email.trim(), permission);
    if (err) setError(err);
    else setEmail('');
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">캘린더 공유</span>
          {pendingInvites.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
              {pendingInvites.length}
            </span>
          )}
        </div>
        <span className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4">
          {/* 초대 받은 것 (수락 대기) */}
          {pendingInvites.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 mb-2 font-medium">받은 초대</h4>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm">{invite.ownerName}</p>
                    <p className="text-xs text-gray-400">{invite.ownerEmail}</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => acceptInvite(invite.id)}
                      className="text-xs bg-gray-900 text-white px-2 py-1 rounded"
                    >
                      수락
                    </button>
                    <button
                      onClick={() => removeShare(invite.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1"
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 내가 공유한 사용자 */}
          {myShares.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 mb-2 font-medium">내가 공유한 사용자</h4>
              {myShares.map((share) => (
                <div key={share.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm">{share.sharedWithEmail}</p>
                    <p className="text-xs text-gray-400">
                      {share.permission === 'view' ? '보기' : '편집'}
                      {!share.accepted && ' · 수락 대기 중'}
                    </p>
                  </div>
                  <button
                    onClick={() => removeShare(share.id)}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 나에게 공유된 캘린더 */}
          {sharedWithMe.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 mb-2 font-medium">공유받은 캘린더</h4>
              {sharedWithMe.map((share) => (
                <div key={share.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div>
                    <p className="text-sm">{share.ownerName}</p>
                    <p className="text-xs text-gray-400">{share.ownerEmail}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {share.permission === 'view' ? '보기' : '편집'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 새 사용자 초대 */}
          <div>
            <h4 className="text-xs text-gray-500 mb-2 font-medium">사용자 초대</h4>
            <div className="flex gap-2 mb-2">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일 주소"
                className="input-field flex-1 text-sm"
              />
              <select
                value={permission}
                onChange={(e) => setPermission(e.target.value as 'view' | 'edit')}
                className="input-field w-auto text-sm"
              >
                <option value="view">보기</option>
                <option value="edit">편집</option>
              </select>
            </div>
            <button
              onClick={handleInvite}
              disabled={loading || !email.trim()}
              className="btn-primary w-full text-sm disabled:opacity-50"
            >
              {loading ? '...' : '초대'}
            </button>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
