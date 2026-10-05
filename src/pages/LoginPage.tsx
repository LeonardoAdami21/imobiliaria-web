import { type FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { TextField } from '@/components/form';
import { ErrorAlert, HouseNumber, Plate } from '@/components/ui';

/** Uma rua de fachadas com número e placa: o que o sistema organiza, em miniatura. */
const STREET = [
  { code: 12, label: 'Aluga-se', tone: 'ok', height: 120 },
  { code: 14, label: 'Alugado', tone: 'info', height: 170 },
  { code: 18, label: 'Vende-se', tone: 'ok', height: 100 },
  { code: 22, label: 'Reservado', tone: 'warn', height: 150 },
  { code: 26, label: 'Vendido', tone: 'danger', height: 125 },
] as const;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isPending, setPending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      navigate((location.state as { from?: string } | null)?.from ?? '/', { replace: true });
    } catch (caught) {
      setError(caught);
      setPending(false);
    }
  };

  return (
    <div className="login">
      <section className="login-art">
        <div>
          <h1>Cada imóvel, do anúncio à chave.</h1>
          <p>Imóveis, atendimento, contratos de locação, cobranças, vendas e comissões da imobiliária em um só lugar.</p>
        </div>
        <div className="street" aria-hidden>
          {STREET.map((house) => (
            <div key={house.code} style={{ height: house.height }}>
              <Plate label={house.label} tone={house.tone} />
              <HouseNumber code={house.code} />
            </div>
          ))}
        </div>
      </section>

      <section className="login-form">
        <form onSubmit={submit} className="stack">
          <div>
            <h2>Entrar</h2>
            <p className="muted">Use o e-mail e a senha do seu usuário.</p>
          </div>
          <ErrorAlert error={error} />
          <TextField label="E-mail" type="email" autoComplete="username" required autoFocus value={email} onChange={setEmail} />
          <TextField label="Senha" type="password" autoComplete="current-password" required value={password} onChange={setPassword} />
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </section>
    </div>
  );
}
