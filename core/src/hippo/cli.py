"""User-facing commands for Hippo core."""

from importlib.metadata import version as package_version
from typing import Annotated

import typer

from hippo.vault.vault_app import vault_app

app = typer.Typer(
    no_args_is_help=True,
    epilog=(
        "Examples (run from the repository root with the core environment activated):\n\n"
        "hippo vault notes 3\n\n"
        "hippo vault read 5\n\n"
        "hippo vault status 5\n\n"
        "hippo vault --help"
    ),
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


def main() -> None:
    """Shared entry point for the installed command and module invocation."""
    app(prog_name="hippo")
