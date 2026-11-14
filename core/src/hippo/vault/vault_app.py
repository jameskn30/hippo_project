"""Vault Typer application and command handlers."""

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated

import typer

from hippo.config import Config
from hippo.vault.registry import VaultRegistry
from hippo.vault.repository import VaultRepository
from hippo.vault.scanner import VaultScanner

vault_app = typer.Typer(
    help="Register, list, and scan local Markdown vaults.",
    no_args_is_help=True,
)


@vault_app.callback()
def configure_vault(
    ctx: typer.Context,
    database: Annotated[
        Path | None,
        typer.Option(
            "--database",
            exists=True,
            file_okay=True,
            dir_okay=False,
            readable=True,
            writable=True,
            resolve_path=True,
            show_default=False,
            help="Override the database configured in .env.migrations or the environment.",
        ),
    ] = None,
) -> None:
    """Keep database selection in the command context without opening it."""
    ctx.obj = database


@contextmanager
def _open_repository(ctx: typer.Context) -> Generator[VaultRepository]:
    """Close command-owned storage and translate expected application errors."""
    database: Path | None = ctx.obj
    try:
        if database is None:
            database = Config.from_env().database_path
        with VaultRepository(database) as repository:
            yield repository
    except (OSError, ValueError, sqlite3.Error, RuntimeError) as error:
        message = str(error)
        if isinstance(error, sqlite3.OperationalError) and message in {
            "no such table: vault",
            "no such table: note",
        }:
            message += ". Apply Hippo migrations to the selected database first."
        typer.echo(f"Error: {message}", err=True)
        raise typer.Exit(code=1) from error


@vault_app.command(
    "add",
    epilog=(
        "Examples (run from the repository root with the core environment activated):\n\n"
        "hippo vault add sandbox/vault\n\n"
        'hippo vault add "$HOME/Documents/My Notes"'
    ),
)
def add_vault(
    ctx: typer.Context,
    path: Annotated[
        Path,
        typer.Argument(
            exists=True,
            file_okay=False,
            dir_okay=True,
            readable=True,
            resolve_path=True,
            help="Path to an existing, readable vault directory.",
        ),
    ],
) -> None:
    """Register a directory, or return its existing registration."""
    with _open_repository(ctx) as repository:
        vault = VaultRegistry(repository).add_vault(path)
    typer.echo(f"Vault {vault.vault_id}: {vault.display_name}\n  {vault.root_path}")


@vault_app.command(
    "list",
    epilog=(
        "Examples (run from the repository root with the core environment activated):\n\n"
        "hippo vault list\n\n"
        "hippo vault --database sandbox/hippo.sqlite3 list"
    ),
)
def list_vaults(ctx: typer.Context) -> None:
    """List registered vaults in ID order, including unavailable roots."""
    with _open_repository(ctx) as repository:
        vaults = VaultRegistry(repository).list_vaults()
    if not vaults:
        typer.echo("No vaults registered.")
        return
    for vault in vaults:
        typer.echo(f"Vault {vault.vault_id}: {vault.display_name}\n  {vault.root_path}")


@vault_app.command(
    "scan",
    epilog=(
        "Examples (run from the repository root with the core environment activated):\n\n"
        "hippo vault scan 3\n\n"
        "hippo vault --database sandbox/hippo.sqlite3 scan 3"
    ),
)
def scan_vault(
    ctx: typer.Context,
    vault_id: Annotated[
        int,
        typer.Argument(min=1, help="Positive vault ID shown by hippo vault list."),
    ],
) -> None:
    """Scan a registered vault and reconcile its Markdown notes."""
    with _open_repository(ctx) as repository:
        result = VaultScanner(repository).scan(vault_id)
    typer.echo(f"Vault {result.vault.vault_id}: {result.vault.display_name}")
    typer.echo(
        f"Created: {result.created} | Updated: {result.updated} | "
        f"Unchanged: {result.unchanged} | Deleted: {result.deleted} | Failed: {result.failed}"
    )
    if result.vault.scan_status != "ok":
        typer.echo(f"Error: Scan incomplete: {result.vault.last_scan_error}", err=True)
        raise typer.Exit(code=1)
