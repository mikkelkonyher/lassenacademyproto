import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from '../src/context/LanguageContext';
import { AuthProvider } from '../src/context/AuthContext';
import RegisterModal from '../src/components/RegisterModal';
import LoginModal from '../src/components/LoginModal';

// Mock Supabase client
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockGetSession = vi.fn().mockResolvedValue({ data: { session: null } });
const mockOnAuthStateChange = vi.fn().mockReturnValue({
  data: { subscription: { unsubscribe: vi.fn() } },
});
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
});

vi.mock('../src/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      getSession: () => mockGetSession(),
      onAuthStateChange: (cb: unknown) => mockOnAuthStateChange(cb),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: (table: string) => mockFrom(table),
  },
}));

function renderWithProviders(ui: ReactNode) {
  return render(
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          {ui}
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

describe('RegisterModal', () => {
  const onClose = vi.fn();
  const onSwitchToLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    renderWithProviders(
      <RegisterModal isOpen={false} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );
    expect(screen.queryByText('Opret profil')).not.toBeInTheDocument();
  });

  it('renders register form when isOpen is true', () => {
    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );
    expect(screen.getAllByText('Opret profil').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('Navn')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
  });

  it('shows error when password is too short', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('Navn'), 'Test User');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(passwordFields[0], '12345');
    await user.type(passwordFields[1], '12345');

    const submitBtn = screen.getByRole('button', { name: 'Opret profil' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Adgangskoden skal være mindst 8 tegn.')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('Navn'), 'Test User');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(passwordFields[0], 'password123');
    await user.type(passwordFields[1], 'differentpassword');

    const submitBtn = screen.getByRole('button', { name: 'Opret profil' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Adgangskoderne matcher ikke.')).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('calls signUp with correct params on valid submit', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('Navn'), 'Test User');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(passwordFields[0], 'password123');
    await user.type(passwordFields[1], 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Opret profil' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
        options: { data: { full_name: 'Test User' } },
      });
    });
  });

  it('shows confirmation message on successful signup', async () => {
    mockSignUp.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('Navn'), 'Test User');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(passwordFields[0], 'password123');
    await user.type(passwordFields[1], 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Opret profil' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Tjek din email for at bekræfte din konto.')).toBeInTheDocument();
    });
  });

  it('shows error message on signup failure', async () => {
    mockSignUp.mockResolvedValueOnce({
      error: { message: 'User already registered' },
    });
    const user = userEvent.setup();

    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    const passwordFields = screen.getAllByPlaceholderText('••••••••');
    await user.type(screen.getByPlaceholderText('Navn'), 'Test User');
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(passwordFields[0], 'password123');
    await user.type(passwordFields[1], 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Opret profil' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('User already registered')).toBeInTheDocument();
    });
  });

  it('calls onSwitchToLogin when login link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    await user.click(screen.getByText('Har du allerede en bruger? Log ind'));
    expect(onSwitchToLogin).toHaveBeenCalled();
  });

  it('closes modal when backdrop is clicked', () => {
    renderWithProviders(
      <RegisterModal isOpen={true} onClose={onClose} onSwitchToLogin={onSwitchToLogin} />
    );

    // Click the backdrop (first child div with bg-black/60)
    const backdrop = document.querySelector('.bg-black\\/60');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('LoginModal', () => {
  const onClose = vi.fn();
  const onSwitchToRegister = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    renderWithProviders(
      <LoginModal isOpen={false} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );
    expect(screen.queryByText('Log ind')).not.toBeInTheDocument();
  });

  it('renders login form when isOpen is true', () => {
    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );
    expect(screen.getAllByText('Log ind').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('calls signIn with correct params on submit', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Log ind' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@test.com',
        password: 'password123',
      });
    });
  });

  it('closes modal on successful login', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Log ind' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows error message on login failure', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword');

    const submitBtn = screen.getByRole('button', { name: 'Log ind' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument();
    });
  });

  it('calls onSwitchToRegister when register link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.click(screen.getByText('Har du ikke en bruger? Opret profil'));
    expect(onSwitchToRegister).toHaveBeenCalled();
  });

  it('disables submit button while loading', async () => {
    // Make signIn hang to test loading state
    mockSignInWithPassword.mockImplementation(() => new Promise(() => {}));
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');

    const submitBtn = screen.getByRole('button', { name: 'Log ind' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '...' })).toBeDisabled();
    });
  });

  it('shows forgot password form when link is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.click(screen.getByText('Glemt adgangskode?'));

    expect(screen.getByText('Nulstil adgangskode')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('name@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send nulstillingslink' })).toBeInTheDocument();
  });

  it('sends reset email on forgot password submit', async () => {
    // Mock profiles lookup returning a match
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: '123' }, error: null }),
        }),
      }),
    });
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.click(screen.getByText('Glemt adgangskode?'));
    await user.type(screen.getByPlaceholderText('name@example.com'), 'test@test.com');

    const submitBtn = screen.getByRole('button', { name: 'Send nulstillingslink' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockResetPasswordForEmail).toHaveBeenCalledWith('test@test.com', expect.objectContaining({
        redirectTo: expect.stringContaining('/reset-password'),
      }));
    });

    await waitFor(() => {
      expect(screen.getByText('Vi har sendt et link til din email. Tjek din indbakke.')).toBeInTheDocument();
    });
  });

  it('shows error when email not found on forgot password', async () => {
    // Mock profiles lookup returning no match
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
        }),
      }),
    });
    // resetPasswordRequest still calls resetPasswordForEmail, so mock it to prevent crash
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'Der findes ingen bruger med denne email.' } });
    const user = userEvent.setup();

    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.click(screen.getByText('Glemt adgangskode?'));
    await user.type(screen.getByPlaceholderText('name@example.com'), 'unknown@test.com');

    const submitBtn = screen.getByRole('button', { name: 'Send nulstillingslink' });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Der findes ingen bruger med denne email.')).toBeInTheDocument();
    });
  });

  it('returns to login form when back to login is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <LoginModal isOpen={true} onClose={onClose} onSwitchToRegister={onSwitchToRegister} />
    );

    await user.click(screen.getByText('Glemt adgangskode?'));
    expect(screen.getByText('Nulstil adgangskode')).toBeInTheDocument();

    await user.click(screen.getByText('Tilbage til log ind'));

    expect(screen.getAllByText('Log ind').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });
});
