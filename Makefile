.PHONY: install run run-frontend run-backend docker

install:
	pnpm install --frozen-lockfile
	pnpm --dir backend install

run:
	$(MAKE) -j2 run-backend run-frontend

run-frontend:
	pnpm dev

run-backend:
	pnpm --dir backend dev

docker:
	docker compose up -d --build
