# io-messages

## Setup

### Using Devcontainer

The preferred way to setup your development environment is to use [Devcontainer](https://containers.dev) ([Host system requirements](https://code.visualstudio.com/docs/devcontainers/containers#_system-requirements)).

> [!TIP]
> If you are on macOS we recommend using [Rancher Desktop](https://rancherdesktop.io/) configured to use `VZ` as _Virtual Machine Type_ and `virtiofs` as volume _Mount Type_.

#### Visual Studio Code

1. Make sure `docker` is available and running in your host system
2. Install the [Devcontainer Extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open the project root folder and select `Dev Containers: Reopen in Container` from the command palette
4. Visual Studio Code will build the devcontainer image and then open the project inside the container, with all the needed tools and extension configured

#### Console

If you use a code editor that doesn't support Dev Container, you can still run it in your terminal.

1. Follow the instruction of the following chapter ("Using local machine") to setup your local environment
2. Run devcontainer from your terminal

   ```bash
   yarn devcontainer up --workspace-folder .
   yarn devcontainer exec --workspace-folder . /bin/bash
   ```

### Using local machine

This project use specific versions of `node`, `yarn` and `terraform`. To make sure your development setup matches with production follow the recommended installation methods.

1. Install and configure the follow tool in your machine

   - [nodenv](https://github.com/nodenv/nodenv) - Node version manager
   - [tfenv](https://github.com/tfutils/tfenv) - Terraform version manager
   - [terraform-docs](https://terraform-docs.io/user-guide/installation/) - Generate Terraform modules documentation in various formats
   - [tflint](https://github.com/terraform-linters/tflint) - A Pluggable Terraform Linter
   - [pre-commit](https://pre-commit.com/) - A framework for managing and maintaining multi-language pre-commit hooks

2. Install `node` at the right version used by this project

   ```bash
    cd path/to/io-messages
    nodenv install
   ```

3. Install `yarn` using [corepack](https://nodejs.org/api/corepack.html) (Node Package Manager version manager, it is distributed with `node`). This step will also install all the required dependencies

   > [!IMPORTANT]
   > Yarn uses Plug and Play for dependency management. For more information, see: [Yarn Plug’n’Play](https://yarnpkg.com/features/pnp)

   ```bash
   corepack enable
   yarn
   ```

4. Build all the workspaces contained by this repo

   ```bash
   yarn build
   ```

## Release management

We use [changesets](https://github.com/changesets/changesets) to automate package versioning and releases.

Each Pull Request that includes changes that require a version bump must include a _changeset file_ that describes the introduced changes.

To create a _changeset file_ run the following command and follow the instructions.

```bash
yarn changeset
```

## Useful commands

This project uses `yarn` and `turbo` with workspaces to manage projects and dependencies. Here is a list of useful commands to work in this repo.

### Work with workspaces

```bash
# build all the workspaces using turbo
yarn build
# or
yarn turbo build

# to execute COMMAND on WORKSPACE_NAME
yarn workspace WORKSPACE_NAME run command
# to execute COMMAD on all workspaces
yarn workspace foreach run command

# run unit tests on citizen-func
yarn workspace citizen-func run test
# or (with turbo)
yarn turbo test -- citizen-func

# run the typecheck script on all workspaces
yarn workspaces foreach run typecheck
```

### Add dependencies

```bash
# add a dependency to the workspace root
yarn add turbo

# add vitest as devDependency on citizen-func
yarn workspace citizen-func add -D vitest

# add zod as dependency on each workspace
yarn workspace foreach add zod
```
