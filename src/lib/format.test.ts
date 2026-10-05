import { describe, expect, it } from 'vitest';
import {
  centsToInput,
  formatAddress,
  formatDate,
  formatMoney,
  formatMonth,
  formatPercent,
  formatPhone,
  formatZipCode,
  inputToCents,
  inputToPercent,
  isoToLocalInput,
  localInputToIso,
  todayIso,
} from './format';

describe('dinheiro', () => {
  it('mostra centavos como reais', () => {
    expect(formatMoney(150000)).toBe('R$ 1.500,00');
    expect(formatMoney(5)).toBe('R$ 0,05');
    expect(formatMoney(43000000)).toBe('R$ 430.000,00');
    expect(formatMoney(null)).toBe('—');
  });

  it('lê o campo de dinheiro tratando os dois últimos dígitos como centavos', () => {
    expect(inputToCents('1.500,00')).toBe(150000);
    expect(inputToCents('150000')).toBe(150000);
    expect(inputToCents('R$ 0,05')).toBe(5);
    expect(inputToCents('7')).toBe(7);
    expect(inputToCents('')).toBeNull();
    expect(inputToCents('abc')).toBeNull();
  });

  it('o que o campo mostra volta para o mesmo valor em centavos', () => {
    for (const cents of [0, 1, 99, 100, 199990, 2580000, 43000000]) {
      expect(inputToCents(centsToInput(cents))).toBe(cents);
    }
    expect(centsToInput(null)).toBe('');
  });
});

describe('datas', () => {
  it('formata data de calendário sem depender de fuso', () => {
    expect(formatDate('2026-03-05')).toBe('05/03/2026');
    expect(formatDate('2026-03-05T00:00:00.000Z')).toBe('05/03/2026');
    expect(formatDate(null)).toBe('—');
    expect(formatMonth('2026-03')).toBe('mar/2026');
  });

  it('usa a data local para "hoje"', () => {
    expect(todayIso(new Date(2026, 2, 5, 23, 30))).toBe('2026-03-05');
  });

  it('converte o campo de data e hora local para ISO e de volta', () => {
    const iso = localInputToIso('2026-03-12T14:00');
    expect(iso).toMatch(/^2026-03-12T\d{2}:00:00\.000Z$/);
    expect(isoToLocalInput(iso)).toBe('2026-03-12T14:00');
  });
});

describe('outros formatos', () => {
  it('telefone, CEP e endereço', () => {
    expect(formatPhone('41999990000')).toBe('(41) 99999-0000');
    expect(formatPhone('4133330000')).toBe('(41) 3333-0000');
    expect(formatPhone(null)).toBe('—');
    expect(formatZipCode('80010000')).toBe('80010-000');
    expect(
      formatAddress({ street: 'Rua das Flores', number: '100', complement: 'Ap 42', district: 'Centro', city: 'Curitiba', state: 'PR' }),
    ).toBe('Rua das Flores, 100, Ap 42 – Centro, Curitiba/PR');
  });

  it('percentual com vírgula', () => {
    expect(formatPercent(4.5)).toBe('4,5%');
    expect(inputToPercent('4,5')).toBe(4.5);
    expect(inputToPercent('10')).toBe(10);
    expect(inputToPercent('')).toBeNull();
    expect(inputToPercent('abc')).toBeNull();
  });
});
