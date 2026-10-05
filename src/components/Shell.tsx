import { useQuery } from '@tanstack/react-query';
import { type ReactNode, useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuBadgeDollarSign,
  LuBuilding2,
  LuCalendarDays,
  LuContact,
  LuHandshake,
  LuHouse,
  LuKeyRound,
  LuLayoutDashboard,
  LuLogOut,
  LuMenu,
  LuReceipt,
  LuSignature,
  LuTarget,
  LuUserCog,
} from 'react-icons/lu';
import { NavLink, useLocation } from 'react-router-dom';
import { api } from '@/api';
import { type Permission, useAuth, useCurrentUser } from '@/auth/AuthContext';
import { ROLE } from '@/lib/labels';

interface NavItem {
  to: string;
  label: string;
  icon: IconType;
  permission?: Permission;
  badge?: 'overdue';
}

const NAV: { group: string | null; items: NavItem[] }[] = [
  { group: null, items: [{ to: '/', label: 'Início', icon: LuLayoutDashboard }] },
  {
    group: 'Cadastros',
    items: [
      { to: '/imoveis', label: 'Imóveis', icon: LuBuilding2 },
      { to: '/pessoas', label: 'Pessoas', icon: LuContact },
    ],
  },
  {
    group: 'Atendimento',
    items: [
      { to: '/leads', label: 'Leads', icon: LuTarget },
      { to: '/visitas', label: 'Visitas', icon: LuCalendarDays },
    ],
  },
  {
    group: 'Locação',
    items: [
      { to: '/locacoes', label: 'Contratos', icon: LuKeyRound },
      { to: '/cobrancas', label: 'Cobranças', icon: LuReceipt, badge: 'overdue' },
    ],
  },
  {
    group: 'Vendas',
    items: [
      { to: '/propostas', label: 'Propostas', icon: LuSignature },
      { to: '/vendas', label: 'Vendas', icon: LuHandshake },
      { to: '/comissoes', label: 'Comissões', icon: LuBadgeDollarSign },
    ],
  },
  { group: 'Administração', items: [{ to: '/usuarios', label: 'Usuários', icon: LuUserCog, permission: 'listUsers' }] },
];

/** Moldura do app: menu lateral fixo no desktop, gaveta no celular. */
export function Shell({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  const { can, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const overdue = useQuery({
    queryKey: ['charges', 'overdue-count'],
    queryFn: () => api.charges.search({ overdue: true, perPage: 1 }),
    staleTime: 60_000,
  });

  return (
    <div className="shell">
      <aside className="sidebar" data-open={open} id="menu">
        <div className="brand">
          <LuHouse aria-hidden />
          <span>Imobiliária</span>
        </div>
        <nav className="nav" aria-label="Principal">
          {NAV.map(({ group, items }) => {
            const visible = items.filter((item) => !item.permission || can(item.permission));
            if (visible.length === 0) return null;
            return (
              <div key={group ?? 'inicio'}>
                {group && <div className="nav-group">{group}</div>}
                {visible.map((item) => (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                    <item.icon aria-hidden />
                    {item.label}
                    {item.badge === 'overdue' && !!overdue.data?.total && (
                      <span className="nav-count" title="Cobranças atrasadas">
                        {overdue.data.total}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="whoami">
          <div className="grow">
            <NavLink to="/conta">{user.name}</NavLink>
            <div className="small">{ROLE[user.role]}</div>
          </div>
          <button type="button" className="icon-btn" onClick={logout} aria-label="Sair" title="Sair">
            <LuLogOut aria-hidden />
          </button>
        </div>
      </aside>

      {open && <button type="button" className="scrim" aria-label="Fechar menu" onClick={() => setOpen(false)} />}

      <div className="main">
        <div className="mobile-bar">
          <button type="button" className="icon-btn" aria-label="Abrir menu" aria-controls="menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <LuMenu aria-hidden />
          </button>
          Imobiliária
        </div>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
