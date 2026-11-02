.DEFAULT_GOAL := help
PYTHON        := .venv/Scripts/python.exe
PIP           := $(PYTHON) -m pip --require-venv

.PHONY: help install dev-install lint format type-check security test migrate \
        pre-commit-install pre-commit-run clean

help:
	@echo "Usage: make <target>"
	@echo ""
	@echo "  install          Install runtime deps"
	@echo "  dev-install      Install all deps including dev"
	@echo "  lint             Run ruff linter"
	@echo "  format           Run ruff formatter"
	@echo "  type-check       Run mypy"
	@echo "  security         Run bandit security scan"
	@echo "  test             Run pytest with coverage"
	@echo "  migrate          Run alembic upgrade head"
	@echo "  pre-commit-install  Install pre-commit hooks"
	@echo "  pre-commit-run   Run all pre-commit hooks against all files"
	@echo "  clean            Remove .pyc / cache files"

install:
	$(PIP) install -e .

dev-install:
	$(PIP) install -e ".[dev]"

lint:
	$(PYTHON) -m ruff check app tests

format:
	$(PYTHON) -m ruff format app tests

type-check:
	$(PYTHON) -m mypy app

security:
	$(PYTHON) -m bandit -c pyproject.toml -r app

test:
	$(PYTHON) -m pytest

migrate:
	$(PYTHON) -m alembic upgrade head

pre-commit-install:
	$(PYTHON) -m pre_commit install

pre-commit-run:
	$(PYTHON) -m pre_commit run --all-files

clean:
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	rm -rf .mypy_cache .ruff_cache .pytest_cache htmlcov .coverage
