"""Daily AI budgets: per kitchen and per chef (a chef cannot multiply budget across kitchens)."""

from __future__ import annotations

from datetime import date

import app.modules.ai.gateway.core as core
import pytest
from app.core.exceptions import AiRateLimitError


@pytest.fixture(autouse=True)
def _clean_counts():
    core._daily_counts.clear()
    yield
    core._daily_counts.clear()


def _limits(monkeypatch: pytest.MonkeyPatch, kitchen: int, chef: int) -> None:
    monkeypatch.setattr(core.settings, "AI_MAX_REQUESTS_PER_KITCHEN_PER_DAY", kitchen)
    monkeypatch.setattr(core.settings, "AI_MAX_REQUESTS_PER_CHEF_PER_DAY", chef)


def test_no_limits_configured_means_unlimited(monkeypatch: pytest.MonkeyPatch) -> None:
    _limits(monkeypatch, 0, 0)
    for _ in range(100):
        core.check_rate_limit("kitchen-1", "chef-1")


def test_chef_budget_spans_all_their_kitchens(monkeypatch: pytest.MonkeyPatch) -> None:
    _limits(monkeypatch, 0, 2)
    core.check_rate_limit("kitchen-1", "chef-1")
    core.check_rate_limit("kitchen-2", "chef-1")
    with pytest.raises(AiRateLimitError):
        core.check_rate_limit("kitchen-3", "chef-1")
    core.check_rate_limit("kitchen-3", "chef-2")  # another chef is unaffected


def test_kitchen_budget_is_shared_by_its_chefs(monkeypatch: pytest.MonkeyPatch) -> None:
    _limits(monkeypatch, 1, 0)
    core.check_rate_limit("kitchen-1", "chef-1")
    with pytest.raises(AiRateLimitError):
        core.check_rate_limit("kitchen-1", "chef-2")


def test_rejected_request_does_not_use_up_the_other_budget(monkeypatch: pytest.MonkeyPatch) -> None:
    _limits(monkeypatch, 1, 5)
    core.check_rate_limit("kitchen-1", "chef-1")
    with pytest.raises(AiRateLimitError):
        core.check_rate_limit("kitchen-1", "chef-1")
    assert core._daily_counts[("chef:chef-1", date.today())] == 1
