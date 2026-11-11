"""Vault Typer application and command handlers."""

import sqlite3
from collections.abc import Generator
from contextlib import contextmanager
from pathlib import Path
from typing import Annotated

import typer

from hippo.vault.registry import VaultRegistry
from hippo.vault.repository import VaultRepository

vault_app = typer.Typer(
    help="Register and list local Markdown vaults.",
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
            help="Existing migrated SQLite database; required for add and list.",
        ),
    ] = None,
) -> None:
    """Keep database selection in the command context without opening it."""
    ctx.obj = database


@contextmanager
def _open_registry(ctx: typer.Context) -> Generator[VaultRegistry]:
    """Close command-owned storage and translate expected application errors."""
    database: Path | None = ctx.obj
    if database is None:
        raise typer.BadParameter(
            "Supply --database PATH before add or list.", param_hint="--database"
        )
    try:
        with VaultRepository(database) as repository:
            yield VaultRegistry(repository)
    except (OSError, ValueError, sqlite3.Error, RuntimeError) as error:
        message = str(error)
        if isinstance(error, sqlite3.OperationalError) and message == "no such table: vault":
            message += ". Apply Hippo migrations to the selected database first."
        typer.echo(f"Error: {message}", err=True)
        raise typer.Exit(code=1) from error


@vault_app.command("add")
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
    with _open_registry(ctx) as registry:
        vault = registry.register(path)
    typer.echo(f"Vault {vault.vault_id}: {vault.display_name}\n  {vault.root_path}")


@vault_app.command("list")
def list_vaults(ctx: typer.Context) -> None:
    """List registered vaults in ID order, including unavailable roots."""
    with _open_registry(ctx) as registry:
        vaults = registry.list_vaults()
    if not vaults:
        typer.echo("No vaults registered.")
        return
    for vault in vaults:
        typer.echo(f"Vault {vault.vault_id}: {vault.display_name}\n  {vault.root_path}")
