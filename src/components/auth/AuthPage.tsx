import { useState } from 'react';
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

export default function AuthPage() {
  const { signIn, signUp } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [color, setColor] = useState(PROFILE_COLORS[0].value);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      if (!displayName.trim()) {
        setError('이름을 입력해 주세요');
        setLoading(false);
        return;
      }
      const err = await signUp(username, password, displayName.trim(), color);
      if (err) setError(err);
      else setSignUpSuccess(true);
    } else {
      const err = await signIn(username, password);
      if (err) setError(err);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          nyo DIARY
        </h1>
        <p className="text-center text-gray-400 text-sm mb-8">
          일정 · 일기 · 체크리스트
        </p>

        {signUpSuccess ? (
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-lg font-semibold">{displayName}</span>
            </div>
            <p className="text-sm text-gray-700 mb-1">
              가입이 완료되었습니다!
            </p>
            <p className="text-xs text-gray-400 mb-4">
              아이디: {username.toLowerCase()}
            </p>
            <button
              onClick={() => { setIsSignUp(false); setSignUpSuccess(false); }}
              className="btn-primary"
            >
              로그인하기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {isSignUp && (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">이름</label>
                  <input
                    type="text"
                    placeholder="캘린더에 표시될 이름"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input-field"
                    required
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
              </>
            )}

            <div>
              <label className="text-xs text-gray-500 mb-1 block">아이디</label>
              <input
                type="text"
                placeholder="영문 소문자, 숫자, _ (3~20자)"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                className="input-field"
                maxLength={20}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">비밀번호</label>
              <input
                type="password"
                placeholder="6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? '...' : isSignUp ? '회원가입' : '로그인'}
            </button>

            <button
              type="button"
              onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
              className="text-sm text-gray-500 hover:text-gray-900 text-center"
            >
              {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
