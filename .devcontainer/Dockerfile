FROM python:3.11-trixie AS base

RUN apt-get update && apt-get install -y \
    libsasl2-dev \ 
    libldap2-dev \ 
    libpq-dev \ 
    tmux \
    gh \ 
    && rm -rf /var/lib/apt/lists/*

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    echo 'export PATH="/root/.cargo/bin:$PATH"' >> /etc/bash.bashrc 

ENV PATH="/root/.cargo/bin:${PATH}"
