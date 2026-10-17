"""Vault Typer application and command handlers."""

from pathlib import Path
from typing import Annotated

import typer

vault_app = typer.Typer(
    help="Manage local Markdown vaults (storage not implemented yet).",
    no_args_is_help=True,
)


@vault_app.command("add")
def add_vault(
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
    """Register a vault directory (storage pending)."""
    typer.echo("Vault storage is not implemented yet.", err=True)
    raise typer.Exit(code=1)


@vault_app.command("list")
def list_vaults() -> None:
    """List registered vaults (storage pending)."""
    typer.echo("Vault storage is not implemented yet.", err=True)
    raise typer.Exit(code=1)
