import os
from pathlib import Path

import environ


def configure_env(base_dir: Path) -> environ.Env:
    env = environ.Env()
    local_env = base_dir / ".env"
    root_env = base_dir.parent / ".env"

    if root_env.exists():
        environ.Env.read_env(root_env, overwrite=False)
    if local_env.exists():
        environ.Env.read_env(local_env, overwrite=False)

    return env


def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}
