import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import pkg from '../../package.json';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import api from '../lib/axios';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const schema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(1, t('auth.passwordRequired')),
  });
  type FormData = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; data: { user: User; token: string } }>(
        '/auth/login', data
      );
      const { user, token } = res.data.data!;
      setAuth(user, token);
      navigate(['Admin', 'Project Manager'].includes(user.role) ? '/dashboard' : '/kanban');
    } catch {
      toast.error(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #ddeef5 0%, #f2f6f8 50%, #e8f3f7 100%)' }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4 shadow-float">
            <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-primary-900">TaskFlow</h1>
          <p className="text-sm text-primary-600/70 font-medium mt-1">Lumina Workspace · {t('auth.signIn').replace(' →', '')}</p>
        </div>

        {/* Card */}
        <div className="glass-card shadow-modal">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">{t('auth.emailAddress')}</label>
              <input
                {...register('email')}
                type="email"
                className="input"
                placeholder="you@company.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-danger text-xs mt-1.5 font-medium">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <input
                {...register('password')}
                type="password"
                className="input"
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {errors.password && <p className="text-danger text-xs mt-1.5 font-medium">{errors.password.message}</p>}
            </div>

            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  {t('auth.signingIn')}
                </span>
              ) : t('auth.signIn')}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-primary-600/50 mt-6 font-medium">
          {t('auth.contactAdmin')}
        </p>

        <p className="text-center text-[11px] text-primary-400/50 mt-4">
          v{pkg.version}
        </p>
      </div>
    </div>
  );
}
