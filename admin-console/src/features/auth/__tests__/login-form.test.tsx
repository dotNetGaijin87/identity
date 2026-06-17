import { describe, expect, test } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '../components/login-form';

function renderLogin() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginForm />} />
          <Route path="/" element={<h1>Tenants home</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  test('shows validation errors when submitting empty', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
  });

  test('shows an error for invalid credentials', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(await screen.findByText(/invalid username or password/i)).toBeInTheDocument();
  });

  test('logs in with valid credentials and redirects', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText(/username/i), 'admin');
    await userEvent.type(screen.getByLabelText(/password/i), 'admin');
    await userEvent.click(screen.getByRole('button', { name: /log in/i }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /tenants home/i })).toBeInTheDocument(),
    );
  });
});
