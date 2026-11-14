"""Synchronous indexing of already captured Markdown, without filesystem reads."""

from typing import Literal

from hippo.vault.models import IndexResult
from hippo.vault.parser import PROCESSOR_VERSION, parse_note
from hippo.vault.repository import VaultRepository


class NoteIndexer:
    """Parse one captured note at a time through caller-owned storage.

    No writer lock is held while parsing, unless the caller wraps the operation
    in a transaction. Notes stay pending (or failed on a retry) until publication;
    there is no durable processing claim to leave behind after an interruption.
    Each result commits independently, so an interrupted pass can be rerun.
    """

    def __init__(self, repository: VaultRepository) -> None:
        self._repository = repository

    def index(self, vault_id: int) -> IndexResult:
        """Index a snapshot of active note IDs; unknown vaults raise ValueError.

        Skip current indexes, retry failures, and skip notes requiring an
        unsupported processor. Concurrent note changes/deletions make a result
        skipped rather than publishing stale data. Newly captured notes after
        the initial catalog snapshot wait for the next pass. Storage errors and
        unexpected parser exceptions propagate; completed notes remain committed.
        """
        vault = self._repository.get_vault(vault_id)
        if vault is None:
            raise ValueError(f"Vault {vault_id} is not registered")
        counts = {"indexed": 0, "unchanged": 0, "skipped": 0, "failed": 0}
        for entry in self._repository.list_note_catalog(vault_id):
            outcome = self._index_note(entry.note_id)
            counts[outcome] += 1
        return IndexResult(vault, **counts)

    def _index_note(self, note_id: int) -> Literal["indexed", "unchanged", "skipped", "failed"]:
        note = self._repository.get_note(note_id)
        if note is None or note.required_processor_version != PROCESSOR_VERSION:
            return "skipped"
        if self._repository.get_note_index(note_id) is not None:
            return "unchanged"
        try:
            parsed = parse_note(note.content, note.relative_path)
        except ValueError as error:
            recorded = self._repository.record_note_index_failure(
                note_id,
                str(error) or type(error).__name__,
                expected_revision=note.revision,
                processor_version=PROCESSOR_VERSION,
            )
            return "failed" if recorded else "skipped"
        published = self._repository.publish_note_index(
            note_id,
            parsed,
            expected_revision=note.revision,
            processor_version=PROCESSOR_VERSION,
        )
        return "indexed" if published else "skipped"
