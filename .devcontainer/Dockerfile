FROM python:3.11-trixie AS base

RUN apt-get update && apt-get install -y \
    libsasl2-dev \
    libldap2-dev \
    libpq-dev \
    tmux \
    gh \
    && rm -rf /var/lib/apt/lists/*

# The uv installer puts the binary in ~/.local/bin (not ~/.cargo/bin).
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

ENV PATH="/root/.local/bin:${PATH}"
