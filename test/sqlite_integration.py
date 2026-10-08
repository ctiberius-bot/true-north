import sqlite3
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCHEMA = (ROOT / "schema.sql").read_text(encoding="utf-8")


def main():
    with tempfile.TemporaryDirectory(prefix="true-north-sqlite-") as temp:
        legacy_database = Path(temp) / "legacy-citadel.sqlite"
        legacy = sqlite3.connect(legacy_database)
        legacy_tables = {
            "emails",
            "observations",
            "canonical_jobs",
            "listing_versions",
            "research_tasks",
            "evidence",
            "arsenal_versions",
            "arsenal_claims",
            "assessments",
            "saved_role_profiles",
            "runs",
            "cursors",
            "cleanup_outbox",
            "audit",
        }
        for statement in SCHEMA.split(";"):
            sql = statement.strip()
            if not sql.startswith("CREATE TABLE IF NOT EXISTS "):
                continue
            name = sql.split()[5]
            if name in legacy_tables:
                legacy.execute(sql)
        legacy.execute(
            "INSERT INTO emails(id,mailbox,source,received_at,is_job_newsletter,expected_observation_count,content_hash) VALUES(?,?,?,?,?,?,?)",
            ("legacy-email", "ctiberius@gmail.com", "indeed", "2026-10-01T00:00:00Z", 1, 0, "legacy-hash"),
        )
        legacy.commit()
        legacy.executescript(SCHEMA)
        legacy.executescript(SCHEMA)
        assert legacy.execute(
            "SELECT mailbox,source,content_hash FROM emails WHERE id='legacy-email'"
        ).fetchone() == ("ctiberius@gmail.com", "indeed", "legacy-hash")
        assert legacy.execute(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='assessment_provenance'"
        ).fetchone()[0] == 1
        legacy.close()

        database = Path(temp) / "citadel.sqlite"
        connection = sqlite3.connect(database)
        connection.executescript(SCHEMA)
        tables = {
            row[0]
            for row in connection.execute(
                "SELECT name FROM sqlite_master WHERE type='table'"
            )
        }
        required = {
            "emails",
            "email_parse_snapshots",
            "observations",
            "candidate_observations",
            "research_tasks",
            "research_checkpoints",
            "canonical_jobs",
            "listing_versions",
            "evidence",
            "arsenal_versions",
            "arsenal_claims",
            "assessments",
            "assessment_provenance",
            "saved_role_profiles",
            "cleanup_outbox",
            "job_requirements",
            "company_dossiers",
            "company_dossier_sources",
            "fit_reviews",
            "application_packages",
            "application_artifacts",
            "artifact_readback_claims",
            "artifact_verifications",
            "package_reviews",
            "pipeline_items",
            "interviews",
            "interviewer_dossiers",
            "interview_records",
            "coach_plans",
            "private_doc_sessions",
            "approved_doc_insights",
            "ai_budget_months",
            "ai_requests",
            "ai_drafts",
        }
        assert required <= tables
        connection.execute(
            "INSERT INTO ai_budget_months(month_utc,limit_microusd,reserved_microusd,spent_microusd,updated_at) VALUES(?,?,?,?,?)",
            ("2026-10", 1_000_000, 10, 999_980, "2026-10-07T00:00:00Z"),
        )
        changed = connection.execute(
            "UPDATE ai_budget_months SET reserved_microusd=reserved_microusd+? WHERE month_utc=? AND spent_microusd+reserved_microusd+?<=limit_microusd",
            (11, "2026-10", 11),
        ).rowcount
        assert changed == 0
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2026-10'"
        ).fetchone() == (10, 999_980)
        try:
            connection.execute(
                "INSERT INTO ai_budget_months(month_utc,limit_microusd,reserved_microusd,spent_microusd,updated_at) VALUES(?,?,?,?,?)",
                ("2026-12", 1_000_000, 600_000, 500_000, "2026-10-07T00:00:00Z"),
            )
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("overcommitted AI budget bypassed fail-closed CHECK")
        connection.execute(
            "INSERT INTO ai_budget_months(month_utc,limit_microusd,reserved_microusd,spent_microusd,updated_at) VALUES(?,?,?,?,?)",
            ("2026-11", 1_000_000, 0, 0, "2026-10-07T00:00:00Z"),
        )
        connection.commit()

        def reserve_concurrently(_):
            contender = sqlite3.connect(database, timeout=30, isolation_level=None)
            contender.execute("PRAGMA busy_timeout=30000")
            try:
                return contender.execute(
                    "UPDATE ai_budget_months SET reserved_microusd=reserved_microusd+? WHERE month_utc=? AND spent_microusd+reserved_microusd+?<=limit_microusd",
                    (100_000, "2026-11", 100_000),
                ).rowcount
            finally:
                contender.close()

        with ThreadPoolExecutor(max_workers=20) as pool:
            reservation_results = list(pool.map(reserve_concurrently, range(20)))
        assert sum(reservation_results) == 10
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2026-11'"
        ).fetchone() == (1_000_000, 0)

        connection.execute(
            "INSERT INTO canonical_jobs(id,source,external_id,title,first_seen_at,last_seen_at) VALUES(?,?,?,?,?,?)",
            ("budget-job", "indeed", "budget-job", "Budget test", "2026-10-07T00:00:00Z", "2026-10-07T00:00:00Z"),
        )
        connection.execute(
            "INSERT INTO ai_budget_months(month_utc,limit_microusd,reserved_microusd,spent_microusd,updated_at) VALUES(?,?,?,?,?)",
            ("2027-01", 1_000_000, 0, 0, "2026-10-07T00:00:00Z"),
        )
        connection.execute(
            "INSERT INTO ai_requests(id,month_utc,model,purpose,canonical_job_id,max_input_tokens,max_output_tokens,reserved_microusd,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("settle-a", "2027-01", "model", "outreach", "budget-job", 5000, 900, 100_000, "reserved", "2026-10-07T00:00:00Z"),
        )
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2027-01'"
        ).fetchone() == (100_000, 0)
        first_settlement = connection.execute(
            "UPDATE ai_requests SET charged_microusd=reserved_microusd,status='failed',completed_at=? WHERE id='settle-a' AND status='reserved'",
            ("2026-10-07T00:00:01Z",),
        ).rowcount
        replay_settlement = connection.execute(
            "UPDATE ai_requests SET charged_microusd=reserved_microusd,status='failed',completed_at=? WHERE id='settle-a' AND status='reserved'",
            ("2026-10-07T00:00:02Z",),
        ).rowcount
        assert (first_settlement, replay_settlement) == (1, 0)
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2027-01'"
        ).fetchone() == (0, 100_000)
        connection.execute(
            "INSERT INTO ai_requests(id,month_utc,model,purpose,canonical_job_id,max_input_tokens,max_output_tokens,reserved_microusd,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("settle-b", "2027-01", "model", "outreach", "budget-job", 5000, 900, 100_000, "reserved", "2026-10-07T00:00:03Z"),
        )
        try:
            connection.execute(
                "UPDATE ai_requests SET charged_microusd=200000,status='failed',completed_at=? WHERE id='settle-b' AND status='reserved'",
                ("2026-10-07T00:00:04Z",),
            )
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("over-reservation settlement did not fail closed")
        assert connection.execute("SELECT status FROM ai_requests WHERE id='settle-b'").fetchone() == ("reserved",)
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2027-01'"
        ).fetchone() == (100_000, 100_000)
        connection.execute(
            "INSERT INTO ai_requests(id,month_utc,model,purpose,canonical_job_id,max_input_tokens,max_output_tokens,reserved_microusd,status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("settle-c", "2027-01", "model", "outreach", "budget-job", 5000, 900, 100_000, "reserved", "2026-10-07T00:00:05Z"),
        )
        connection.commit()

        def settle_same_request(_):
            contender = sqlite3.connect(database, timeout=30, isolation_level=None)
            contender.execute("PRAGMA busy_timeout=30000")
            try:
                return contender.execute(
                    "UPDATE ai_requests SET charged_microusd=reserved_microusd,status='failed',completed_at=? WHERE id='settle-c' AND status='reserved'",
                    ("2026-10-07T00:00:06Z",),
                ).rowcount
            finally:
                contender.close()

        with ThreadPoolExecutor(max_workers=2) as pool:
            settlement_results = list(pool.map(settle_same_request, range(2)))
        assert sum(settlement_results) == 1
        assert connection.execute(
            "SELECT reserved_microusd,spent_microusd FROM ai_budget_months WHERE month_utc='2027-01'"
        ).fetchone() == (100_000, 200_000)

        email = (
            "m1",
            "t1",
            "ctiberius@gmail.com",
            "indeed",
            "2026-10-07T00:00:00Z",
            "Jobs",
            "jobs@indeed.com",
            1,
            0,
            0,
            0,
            1,
            "2026-10-07T00:00:01Z",
            "hash",
        )
        connection.execute(
            "INSERT OR IGNORE INTO emails VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", email
        )
        connection.execute(
            "INSERT OR IGNORE INTO emails VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)", email
        )
        assert connection.execute("SELECT COUNT(*) FROM emails").fetchone()[0] == 1

        connection.execute(
            "INSERT INTO email_parse_snapshots VALUES(?,?,?,?,?)",
            ("m1", "email-links-v2", "<a>raw</a>", "[]", "2026-10-07T00:00:01Z"),
        )
        connection.execute(
            "INSERT INTO observations VALUES(?,?,?,?,?,?,?,?)",
            (
                "m1:0",
                "m1",
                0,
                "indeed",
                "listing",
                "https://indeed.com/rc/clk?jk=1",
                "Role",
                "2026-10-07T00:00:01Z",
            ),
        )
        connection.execute(
            "INSERT INTO candidate_observations VALUES(?,?,?,?)",
            (
                "m1:0",
                "email-links-v2",
                "unclassified_provider_link",
                "2026-10-07T00:00:01Z",
            ),
        )
        connection.execute(
            "INSERT INTO research_tasks(id,observation_id,source,task_kind,url,status,attempts,updated_at) VALUES(?,?,?,?,?,?,?,?)",
            (
                "task1",
                "m1:0",
                "indeed",
                "fetch_listing",
                "https://indeed.com/rc/clk?jk=1",
                "incomplete_retry",
                1,
                "2026-10-07T00:00:02Z",
            ),
        )
        connection.execute(
            "INSERT INTO research_task_observations(task_id,observation_id,created_at) VALUES(?,?,?)",
            ("task1", "m1:0", "2026-10-07T00:00:02Z"),
        )
        connection.execute(
            "INSERT OR IGNORE INTO research_task_observations(task_id,observation_id,created_at) VALUES(?,?,?)",
            ("task1", "m1:0", "2026-10-07T00:00:03Z"),
        )
        assert connection.execute(
            "SELECT COUNT(*) FROM research_task_observations WHERE task_id='task1'"
        ).fetchone()[0] == 1
        state = '{"next_url":"https://indeed.com/jobs?page=2","pages":1,"discovered_tasks":[]}'
        connection.execute(
            "INSERT INTO research_checkpoints VALUES(?,?,?,?,?,?)",
            (
                "task1",
                "https://indeed.com/jobs?page=2",
                1,
                0,
                state,
                "2026-10-07T00:00:02Z",
            ),
        )
        connection.commit()
        connection.close()

        reopened = sqlite3.connect(database)
        checkpoint = reopened.execute(
            "SELECT next_url,pages,state_json FROM research_checkpoints WHERE task_id='task1'"
        ).fetchone()
        assert checkpoint == ("https://indeed.com/jobs?page=2", 1, state)

        for sql, params in [
            (
                "INSERT INTO observations VALUES(?,?,?,?,?,?,?,?)",
                (
                    "bad-observation",
                    "m1",
                    9,
                    "indeed",
                    "candidate",
                    "https://example.invalid",
                    None,
                    "2026-10-07T00:00:03Z",
                ),
            ),
            (
                "INSERT INTO research_tasks(id,source,task_kind,url,status,attempts,updated_at) VALUES(?,?,?,?,?,?,?)",
                (
                    "bad-task",
                    "indeed",
                    "fetch_listing",
                    "https://example.invalid",
                    "silently_complete",
                    0,
                    "2026-10-07T00:00:03Z",
                ),
            ),
        ]:
            try:
                reopened.execute(sql, params)
            except sqlite3.IntegrityError:
                pass
            else:
                raise AssertionError("malformed row bypassed a CHECK constraint")

        reopened.execute(
            "INSERT INTO arsenal_versions VALUES(?,?,?,?,?)",
            (
                "arsenal-v1",
                "1K2lnMkDkV4oPPLBKE0M1Mwn8BjClM8UZ",
                "hash-a",
                "2026-10-07T00:00:04Z",
                0,
            ),
        )
        try:
            reopened.execute(
                "INSERT INTO arsenal_versions VALUES(?,?,?,?,?)",
                (
                    "arsenal-v1",
                    "shadow",
                    "hash-b",
                    "2026-10-07T00:00:05Z",
                    0,
                ),
            )
        except sqlite3.IntegrityError:
            pass
        else:
            raise AssertionError("immutable Arsenal version was overwritten")
        reopened.close()

    print("sqlite integration: PASS")


if __name__ == "__main__":
    main()
