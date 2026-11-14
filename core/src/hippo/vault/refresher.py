"""One manual reconciliation pass from Markdown files to searchable notes."""

from hippo.vault.indexer import NoteIndexer
from hippo.vault.models import RefreshResult
from hippo.vault.repository import VaultRepository
from hippo.vault.scanner import VaultScanner


class VaultRefresher:
    """Coordinate existing scanning and indexing through caller-owned storage."""

    def __init__(self, repository: VaultRepository) -> None:
        self._repository = repository

    def refresh(self, vault_id: int) -> RefreshResult:
        """Scan once, then index only after a complete successful scan.

        Unknown vaults and storage failures propagate to the caller. An incomplete
        scan returns its recorded failure with index=None, preserving captured
        notes and skipping indexing. Without a caller-owned outer transaction, a
        successful scan commits before indexing; completed captures and index
        publications survive an indexing failure so a later invocation can resume.
        No encompassing transaction is introduced. Any caller-owned transaction
        retains its existing commit and lock behavior.

        The caller owns scheduling and connection lifetime. This operation starts
        no timers, watchers, or background workers and writes no Markdown files.
        """
        scan = VaultScanner(self._repository).scan(vault_id)
        if scan.vault.scan_status != "ok":
            return RefreshResult(scan, None)
        indexed = NoteIndexer(self._repository).index(vault_id)
        return RefreshResult(scan, indexed)
