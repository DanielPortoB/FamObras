# Publicar o FAM Obras na Vercel com dados salvos

O site precisa do frontend, da função de API e de um banco Turso/libSQL. A função de API e a tela de acesso por senha estão neste projeto.

## 1. Configure o banco

Crie um banco Turso/libSQL e obtenha a URL e o token de acesso. No repositório, copie `.env.template` para `.env` na pasta raiz e preencha:

```env
DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...
```

Com o Bun instalado, rode `bun run db:push` na pasta raiz do repositório para criar as tabelas. O arquivo `.env` está no `.gitignore`; não o envie ao GitHub.

### Diagnóstico do cadastro de funcionários

O código aceita também `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`, usados pela integração da Vercel. A aplicação e o Drizzle Kit usam a mesma precedência: `DATABASE_*` primeiro, `TURSO_*` como alternativa. Confira se apontam para o banco do ambiente desejado.

Em `packages/web`, execute `bun run db:check:employees`. Esse diagnóstico é somente leitura: verifica as três tabelas de funcionários, as colunas esperadas e a restrição de CPF único, sem exibir dados pessoais ou credenciais. Configure as credenciais diretamente no seu ambiente; não as compartilhe em chats ou no repositório.

O build de produção na Vercel inicializa as tabelas e os índices ausentes usando o SQL versionado em `packages/web/drizzle`. O script usa uma transação e impede a publicação se faltarem colunas em uma tabela existente. Builds de Preview não executam essa etapa. Em um banco que já tenha tabelas, revise qualquer alteração de colunas separadamente. O provisionamento da Vercel não grava o histórico do `db:migrate`, portanto reconcilie esse histórico antes de usar o migrador sobre um banco já provisionado.

A mensagem de CPF duplicado deve corresponder apenas à violação de `employees.cpf`. Falhas de conexão, autenticação ou schema devem aparecer como falha de carregamento/gravação; os logs `employees.list` e `employees.save` registram somente o código do erro do banco. Cadastro e edição gravam o funcionário, integrações e NRs na mesma transação para evitar cadastros parciais.

Validação local: em `packages/web`, execute `bun test tests`. Os testes usam um banco temporário isolado, sem acessar o Turso. Para validação visual de um Preview, configure senha/segredo de acesso próprios para Preview e um banco de teste separado.

## 2. Configure o projeto da Vercel

Em **Settings → General**, defina **Root Directory** como `packages/web`. Depois, em **Settings → Environment Variables**, adicione para **Production**:

- `DATABASE_URL` — a URL do banco Turso/libSQL.
- `DATABASE_AUTH_TOKEN` — o token do banco.
- `APP_PASSWORD` — uma senha forte que só você conhece.
- `APP_AUTH_SECRET` — uma chave aleatória longa, diferente da senha.

Não coloque esses valores no código nem no GitHub. A tela e as rotas da API ficam protegidas pela senha do app; a sessão expira em 12 horas.

## 3. Publique

Envie as alterações deste projeto ao GitHub. A Vercel deve iniciar uma nova implantação. Acesse o endereço `*.vercel.app`, entre com `APP_PASSWORD` e teste criando um registro. Atualizações futuras enviadas ao GitHub também iniciam uma nova implantação.
