import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
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

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  color: string;
  is_admin: boolean;
  deleted: boolean;
  created_at: string;
}

export default function AdminPage({ onClose }: { onClose: () => void }) {
  const { profile } = useAuthStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [addUsername, setAddUsername] = useState('');
  const [addDisplayName, setAddDisplayName] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addColor, setAddColor] = useState(PROFILE_COLORS[0].value);
  const [addLoading, setAddLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPw, setShowAdminPw] = useState(false);

  if (!profile?.isAdmin) return null;

  const loadUsers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .or('deleted.eq.false,deleted.is.null')
      .order('created_at', { ascending: false });
    if (data) setUsers(data as UserRow[]);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setMsg({ type: 'err', text: '비밀번호는 6자 이상이어야 합니다' });
      return;
    }
    setMsg({ type: 'err', text: '비밀번호 초기화는 Supabase 대시보드 > Authentication > Users에서 수행해 주세요' });
    setResetTarget(null);
    setNewPassword('');
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`"${username}" 사용자를 비활성화하시겠습니까?`)) return;

    const { error } = await supabase
      .from('profiles')
      .update({ deleted: true })
      .eq('id', userId);

    if (error) {
      setMsg({ type: 'err', text: `실패: ${error.message}` });
    } else {
      setMsg({ type: 'ok', text: `"${username}" 사용자가 비활성화되었습니다` });
      await loadUsers();
    }
  };

  const handleAddUser = async () => {
    const trimmed = addUsername.trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(trimmed)) {
      setMsg({ type: 'err', text: '아이디는 3~20자 영문 소문자, 숫자, _만 사용 가능합니다' });
      return;
    }
    if (!addDisplayName.trim()) {
      setMsg({ type: 'err', text: '이름을 입력해 주세요' });
      return;
    }
    if (addPassword.length < 6) {
      setMsg({ type: 'err', text: '비밀번호는 6자 이상이어야 합니다' });
      return;
    }

    // 중복 체크
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', trimmed)
      .single();
    if (existing) {
      setMsg({ type: 'err', text: '이미 사용 중인 아이디입니다' });
      return;
    }

    if (!adminPassword) {
      setShowAdminPw(true);
      setMsg({ type: 'err', text: '관리자 비밀번호를 입력해 주세요' });
      setAddLoading(false);
      return;
    }

    setAddLoading(true);
    const adminEmail = `${profile?.username}@nyodiary.app`;

    // 1. 새 사용자 가입
    const email = `${trimmed}@nyodiary.app`;
    const { data, error } = await supabase.auth.signUp({ email, password: addPassword });

    if (error) {
      setMsg({ type: 'err', text: error.message });
      setAddLoading(false);
      return;
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        username: trimmed,
        display_name: addDisplayName.trim(),
        color: addColor,
        is_admin: false,
        deleted: false,
      });
    }

    // 2. 관리자로 다시 로그인
    await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPassword });

    setMsg({ type: 'ok', text: `"${trimmed}" 사용자가 추가되었습니다` });
    setAddUsername('');
    setAddDisplayName('');
    setAddPassword('');
    setAddColor(PROFILE_COLORS[0].value);
    setShowAddUser(false);
    setAddLoading(false);

    await loadUsers();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content overflow-x-hidden sm:max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">관리자 페이지</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900">✕</button>
        </div>

        {msg && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="ml-2 opacity-50 hover:opacity-100">✕</button>
          </div>
        )}

        {/* 사용자 추가 */}
        <div className="mb-4">
          <button
            onClick={() => setShowAddUser(!showAddUser)}
            className="btn-primary w-full text-sm"
          >
            {showAddUser ? '취소' : '+ 사용자 추가'}
          </button>

          {showAddUser && (
            <div className="mt-3 p-3 border border-gray-200 rounded-lg flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">아이디</label>
                <input
                  type="text"
                  value={addUsername}
                  onChange={(e) => setAddUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  placeholder="영문 소문자, 숫자, _ (3~20자)"
                  className="input-field text-sm"
                  maxLength={20}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">이름</label>
                <input
                  type="text"
                  value={addDisplayName}
                  onChange={(e) => setAddDisplayName(e.target.value)}
                  placeholder="캘린더에 표시될 이름"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">비밀번호</label>
                <input
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  placeholder="6자 이상"
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">프로필 색상</label>
                <div className="flex gap-2 flex-wrap">
                  {PROFILE_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setAddColor(c.value)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        addColor === c.value ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">관리자 비밀번호 확인</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="관리자 본인 비밀번호"
                  className="input-field text-sm"
                />
              </div>
              <button
                onClick={handleAddUser}
                disabled={addLoading}
                className="btn-primary text-sm disabled:opacity-50"
              >
                {addLoading ? '추가 중...' : '사용자 추가'}
              </button>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-400 mb-3">
          총 {users.length}명의 사용자
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-4">로딩 중...</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto">
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
                      onClick={() => { setResetTarget(resetTarget === u.id ? null : u.id); setNewPassword(''); }}
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
                      onClick={handleResetPassword}
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
