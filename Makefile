.PHONY: install run lint build preview format

install:
	pnpm install --frozen-lockfile

run:
	pnpm dev

lint:
	pnpm lint

build:
	pnpm build

preview:
	pnpm preview

format:
	pnpm format
