"""User-facing commands for Hippo core."""

from importlib.metadata import version as package_version
from pathlib import Path
from typing import Annotated

import typer

app = typer.Typer(no_args_is_help=True)
vault_app = typer.Typer(
    help="Manage local Markdown vaults (storage not implemented yet).",
    no_args_is_help=True,
)
app.add_typer(vault_app, name="vault")


def show_version(value: bool) -> None:
    if value:
        typer.echo(f"Hippo core {package_version('hippo-core')}")
        raise typer.Exit()


@app.callback()
def root(
    version: Annotated[
        bool,
        typer.Option(
            "--version",
            callback=show_version,
            is_eager=True,
            help="Show the installed Hippo core version and exit.",
        ),
    ] = False,
) -> None:
    """Hippo core command-line interface."""


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


def main() -> None:
    """Shared entry point for the installed command and module invocation."""
    app(prog_name="hippo")
