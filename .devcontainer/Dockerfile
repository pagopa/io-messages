FROM mcr.microsoft.com/devcontainers/base:debian@sha256:da67c59f82e057e0ccb81ec7d13fb50464c26f477638018e6de1b2623a008a3a

ARG AZURE_FUNCTIONS_CORE_TOOLS_VERSION=4.12.0-1

RUN curl -sSL https://packages.microsoft.com/config/debian/12/packages-microsoft-prod.deb \
			-o /tmp/packages-microsoft-prod.deb \
		&& dpkg -i /tmp/packages-microsoft-prod.deb \
		&& rm /tmp/packages-microsoft-prod.deb \
		&& apt-get update \
		&& apt-get install -y --no-install-recommends \
			azure-functions-core-tools-4=${AZURE_FUNCTIONS_CORE_TOOLS_VERSION} \
		&& rm -rf /var/lib/apt/lists/*

# Add yarn alias
RUN echo 'alias y="yarn"' >> /etc/bash.bashrc

CMD ["sleep", "infinity"]
