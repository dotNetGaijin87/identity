import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/button';
import { InputField } from '@/components/input-field';
import { Card } from '@/components/misc';
import { ApiError } from '@/types';
import { loginSchema, type LoginInput } from '../types';
import { useLogin } from '../api/login';

export function LoginForm() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const redirect = params.get('redirect') || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const loginMutation = useLogin({
    onSuccess: () => navigate(redirect, { replace: true }),
  });

  const submitError =
    loginMutation.error instanceof ApiError
      ? loginMutation.error.message
      : loginMutation.isError
        ? 'Unable to sign in. Please try again.'
        : undefined;

  return (
    <div className="auth">
      <Card className="auth__card">
        <h1>Admin Console</h1>
        <p className="muted">Sign in to manage tenants, users, clients, and roles.</p>
        <form onSubmit={handleSubmit((values) => loginMutation.mutate(values))} noValidate>
          <InputField
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <InputField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {submitError && (
            <p className="field__error" role="alert">
              {submitError}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" isLoading={loginMutation.isPending}>
              Log in
            </Button>
          </div>
        </form>
        <p className="muted" style={{ marginTop: '1rem' }}>
          Demo credentials: <code>admin</code> / <code>admin</code>
        </p>
      </Card>
    </div>
  );
}
