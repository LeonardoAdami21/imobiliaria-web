# Imobiliária Web

Painel web da [imobiliaria-api](../imobiliaria-api): imóveis, pessoas, leads, visitas, contratos de locação, cobranças, propostas, vendas e comissões.

- **Stack:** React 19, Vite 8, TypeScript, axios, react-icons, React Router, TanStack Query
- **Sem biblioteca de componentes:** o visual é CSS próprio, em `src/styles/app.css`

## Como rodar

A API precisa estar no ar primeiro (veja o README dela).

```bash
cp .env.example .env     # VITE_API_URL=http://localhost:3333
npm install
npm run dev              # http://localhost:5173
```

Para ter dados de exemplo, rode `npm run db:seed` na API e entre com `admin@demo.com.br` / `demo12345`.

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Checa os tipos e gera os arquivos estáticos em `dist/` |
| `npm run preview` | Serve o `dist/` localmente, para conferir o build |
| `npm run typecheck` | Só a checagem de tipos |
| `npm test` | Testes de formatação de valores e do rateio de comissão |

### Produção

`npm run build` gera arquivos estáticos; qualquer servidor web os serve. O `Dockerfile` faz isso com nginx:

```bash
docker build --build-arg VITE_API_URL=https://api.suaimobiliaria.com.br -t imobiliaria-web .
docker run -d -p 8080:80 imobiliaria-web
```

O endereço da API é embutido no build, então cada instalação (cada imobiliária) tem a sua imagem.
Na API, ajuste `CORS_ORIGIN` para o endereço em que este painel é servido.

## Estrutura

```
src/
  main.tsx              provedores (React Query, rotas, sessão, avisos)
  App.tsx               tabela de rotas e proteção por papel
  api/
    http.ts             cliente axios: token, tradução de erros, sessão expirada
    index.ts            uma função por rota da API
    types.ts            tipos devolvidos e aceitos pela API
  auth/AuthContext.tsx  sessão, login, logout e permissões por papel
  components/
    Shell.tsx           menu lateral (gaveta no celular)
    ui.tsx              tabela, diálogo, placas, etiquetas, estados vazios e de erro
    form.tsx            campos: texto, seleção, dinheiro, seletor com busca
    lookups.tsx         nome de pessoa, imóvel e usuário a partir do id
    ChargeTable.tsx     cobranças com baixa e repasse
  forms/                formulários de cadastro (imóvel, pessoa, lead, visita, contrato, proposta, venda)
  pages/                uma tela por item do menu
  lib/                  formatação pt-BR, rótulos, rateio de comissão, hooks pequenos
  styles/app.css        tokens de cor e tipografia, e todos os componentes visuais
```

## Como o front conversa com a API

- **Sessão:** o token JWT fica no `localStorage` e vai no cabeçalho `Authorization` de cada requisição. Se a API responde que o token não vale mais, o app volta para o login.
- **Erros:** a API devolve `{ error: { code, message, details } }`. O interceptor do axios transforma isso em `ApiError`, e os formulários mostram a mensagem (já em português) e o problema de cada campo.
- **Dinheiro:** circula em centavos, como na API. `MoneyField` converte para "1.500,00" na tela.
- **Datas:** datas de calendário (`AAAA-MM-DD`) são formatadas por texto, sem passar por `Date`, para não mudar de dia por causa de fuso.
- **Referências por id:** a API devolve `ownerId`, `tenantId`, `brokerId`. Os componentes de `lookups.tsx` buscam o nome por trás de cada id e o React Query guarda o resultado, então o mesmo id não é consultado duas vezes.
- **Depois de cada ação:** todas as consultas em tela são recarregadas, porque uma ação costuma mudar mais de um lugar (fechar uma venda altera o imóvel, as propostas e as comissões).

## Permissões

A tela esconde o que o papel não pode fazer; quem decide de verdade é a API.

| Ação | Administrador | Gerente | Corretor | Financeiro |
|---|---|---|---|---|
| Cadastrar e editar imóveis | sim | sim | sim | não |
| Leads, visitas e pessoas | sim | sim | sim | sim |
| Criar contrato, dar baixa, repasse, reajuste | sim | sim | não | sim |
| Registrar e cancelar proposta | sim | sim | sim | não |
| Aceitar ou recusar proposta, fechar venda | sim | sim | não | não |
| Pagar comissão | sim | sim | não | sim |
| Ver usuários | sim | sim | não | não |
| Cadastrar e editar usuários | sim | não | não | não |

O corretor vê apenas as próprias comissões.

## Identidade visual

- **Placa:** a situação do imóvel (disponível, reservado, alugado, vendido) aparece como a placa pendurada na fachada, em cor cheia.
- **Número da casa:** o código do imóvel usa o formato da plaquinha esmaltada azul de número de casa.
- **Início:** em vez de indicadores, a fila do que precisa de alguém hoje: cobranças atrasadas, repasses a fazer, leads sem corretor, visitas, propostas e comissões.
- **Tipografia:** Bricolage Grotesque nos títulos e Instrument Sans no texto, instaladas pelo npm (sem chamada a servidor de fontes).

## O que ficou fora desta primeira versão

- **Upload de fotos:** a tela pede o endereço (URL) de uma imagem já hospedada, porque a API ainda não recebe arquivos.
- **Arrastar no funil:** os leads mudam de etapa pelo botão "Mover", não por arrastar e soltar.
- **Busca de lead por nome:** a API não tem esse filtro; o seletor de lead carrega os leads em aberto e filtra no navegador.
- **Listas com muitos nomes:** cada pessoa ou imóvel referenciado é uma consulta à API (guardada em cache). Com centenas de linhas, vale criar na API rotas que já devolvam os nomes.
- **Testes de tela automatizados:** os fluxos foram conferidos em navegador durante o desenvolvimento, mas não há suíte de testes de interface no projeto.
