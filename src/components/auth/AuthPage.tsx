import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

export default function AuthPage() {
  const { signIn, signUp } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isSignUp) {
      const err = await signUp(email, password);
      if (err) setError(err);
      else setSignUpSuccess(true);
    } else {
      const err = await signIn(email, password);
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
            <p className="text-sm text-gray-700 mb-4">
              인증 메일을 발송했습니다.<br />
              이메일을 확인해 주세요.
            </p>
            <button
              onClick={() => { setIsSignUp(false); setSignUpSuccess(false); }}
              className="btn-primary"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              required
            />
            <input
              type="password"
              placeholder="비밀번호 (6자 이상)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              minLength={6}
              required
            />

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
