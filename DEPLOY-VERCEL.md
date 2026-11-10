# Publicar o FAM Obras na Vercel com dados salvos

O site precisa do frontend, da função de API e de um banco Turso/libSQL. A função de API e a tela de acesso por senha estão neste projeto.

## 1. Configure o banco

Crie um banco Turso/libSQL e obtenha a URL e o token de acesso. No repositório, copie `.env.template` para `.env` na pasta raiz e preencha:

```env
DATABASE_URL=libsql://...
DATABASE_AUTH_TOKEN=...
```

Com o Bun instalado, rode `bun run db:push` na pasta raiz do repositório para criar as tabelas. O arquivo `.env` está no `.gitignore`; não o envie ao GitHub.

## 2. Configure o projeto da Vercel

Em **Settings → General**, defina **Root Directory** como `packages/web`. Depois, em **Settings → Environment Variables**, adicione para **Production**:

- `DATABASE_URL` — a URL do banco Turso/libSQL.
- `DATABASE_AUTH_TOKEN` — o token do banco.
- `APP_PASSWORD` — uma senha forte que só você conhece.
- `APP_AUTH_SECRET` — uma chave aleatória longa, diferente da senha.

Não coloque esses valores no código nem no GitHub. A tela e as rotas da API ficam protegidas pela senha do app; a sessão expira em 12 horas.

## 3. Publique

Envie as alterações deste projeto ao GitHub. A Vercel deve iniciar uma nova implantação. Acesse o endereço `*.vercel.app`, entre com `APP_PASSWORD` e teste criando um registro. Atualizações futuras enviadas ao GitHub também iniciam uma nova implantação.
