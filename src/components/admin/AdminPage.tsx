import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  color: string;
  is_admin: boolean;
  created_at: string;
}

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  if (!profile?.isAdmin) return null;

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleResetPassword = async (userId: string) => {
    if (newPassword.length < 6) {
      setMsg('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    // Supabase Admin API로는 클라이언트에서 다른 사용자 비번 변경이 안 되므로
    // Edge Function이 필요하지만, 간단히 profiles에 reset_password 플래그를 쓰는 방식으로 대체
    // 여기서는 service_role이 없으므로 안내 메시지
    setMsg('비밀번호 초기화는 Supabase 대시보드 > Authentication > Users에서 수행해 주세요');
    setResetTarget(null);
    setNewPassword('');
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`"${username}" 사용자를 삭제하시겠습니까?\n관련 일정, 체크리스트, 일기가 모두 삭제됩니다.`)) return;

    // 프로필 삭제 (CASCADE로 events, checklists, diaries도 삭제됨)
    // auth.users는 클라이언트에서 삭제 불가 → 대시보드에서 수행
    const { error } = await supabase.from('profiles').delete().eq('id', userId);
    if (error) {
      setMsg(`삭제 실패: ${error.message}`);
    } else {
      setMsg(`"${username}" 프로필이 삭제되었습니다. 인증 계정은 Supabase 대시보드에서 삭제해 주세요.`);
      await loadUsers();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content overflow-x-hidden sm:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">관리자 페이지</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">✕</button>
        </div>

        {msg && (
          <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
            {msg}
            <button onClick={() => setMsg(null)} className="ml-2 text-gray-400 hover:text-gray-900">✕</button>
          </div>
        )}

        <div className="text-xs text-gray-400 mb-3">
          총 {users.length}명의 사용자
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-4">로딩 중...</p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full shrink-0" style={{ backgroundColor: u.color || '#6b7280' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {u.display_name}
                        {u.is_admin && <span className="text-xs text-gray-400 ml-1">(관리자)</span>}
                      </p>
                      <p className="text-xs text-gray-400">@{u.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setResetTarget(resetTarget === u.id ? null : u.id)}
                      className="text-xs text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                    >
                      비번초기화
                    </button>
                    {!u.is_admin && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.username)}
                        className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100"
                      >
                        삭제
                      </button>
                    )}
                  </div>
                </div>

                {/* 비밀번호 초기화 */}
                {resetTarget === u.id && (
                  <div className="mt-2 pt-2 border-t border-gray-100 flex gap-2">
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="새 비밀번호 (6자 이상)"
                      className="input-field flex-1 text-xs"
                    />
                    <button
                      onClick={() => handleResetPassword(u.id)}
                      className="btn-primary text-xs px-3"
                    >
                      변경
                    </button>
                  </div>
                )}

                <p className="text-[10px] text-gray-300 mt-1">
                  가입일: {new Date(u.created_at).toLocaleDateString('ko')}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button onClick={onClose} className="btn-secondary">닫기</button>
        </div>
      </div>
    </div>
  );
}
