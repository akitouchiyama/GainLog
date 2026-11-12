# ビルド成果物の確認用イメージ（project-structure.md 6.4、ADR-0012）。本番は Workers でありコンテナではない。
# workerd は musl（Alpine）に対応しないため Debian 系を使う。版は .nvmrc に合わせる
FROM docker.io/library/node:24-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
# postinstall（wrangler types --env-file .dev.vars.example）が wrangler.jsonc と .dev.vars.example を読む
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml wrangler.jsonc .dev.vars.example ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM build AS runtime
ENV CI=true
EXPOSE 4173
# ローカル D1 はコンテナ内で使い捨て。起動のたびに migration（シードを含む）から再構築する
CMD ["sh", "-c", "pnpm db:migrate:local && pnpm preview --host 0.0.0.0 --port 4173 --strictPort"]
