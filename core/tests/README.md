# Core unit tests

Write unit tests for `src/hippo/` here, keeping test folders aligned with application components. Name test modules `test_*.py`, such as `test_cli.py` or `notes/test_storage.py`.

For Python 3.13's built-in `unittest` discovery, add `__init__.py` to nested test directories when they are created.

Once tests are added, run them from `core/`:

```sh
uv run python -m unittest discover -s tests -v
```

This folder currently contains documentation only. No test cases or additional test dependencies have been added.
