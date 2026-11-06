.PHONY: install run run-frontend run-backend lint build preview format

install:
	pnpm install --frozen-lockfile
	pnpm --dir backend install

run:
	$(MAKE) -j2 run-backend run-frontend

run-frontend:
	pnpm dev

run-backend:
	pnpm --dir backend dev

lint:
	pnpm lint
	pnpm --dir backend lint

build:
	pnpm build

preview:
	pnpm preview

format:
	pnpm format
