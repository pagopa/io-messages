terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "<= 3.116.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfappprodio"
    container_name       = "terraform-state"
    key                  = "io-messages.identity.prod.tfstate"
  }
}

provider "azurerm" {
  features {
  }
}

module "federated_identities" {
  source = "github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github?ref=f339355788f12e5e4719159dca45d7c0b5c0c537"

  prefix    = local.prefix
  env_short = local.env_short
  env       = local.env
  domain    = local.domain

  repositories = [local.repo_name]

  continuos_delivery = {
    enable = true,
    roles  = local.environment_cd_roles
  }

  tags = local.tags
}

module "app_federated_identities" {
  source = "github.com/pagopa/dx//infra/modules/azure_federated_identity_with_github?ref=f339355788f12e5e4719159dca45d7c0b5c0c537"

  prefix       = local.prefix
  env_short    = local.env_short
  env          = "app-${local.env}"
  domain       = "${local.domain}-app"
  repositories = [local.repo_name]
  tags         = local.tags

  continuos_integration = { enable = false }
}

resource "azurerm_key_vault_access_policy" "ci_kv_common" {
  key_vault_id = data.azurerm_key_vault.weu_common.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.federated_identities.federated_ci_identity.id

  secret_permissions = ["Get", "List"]
}

resource "azurerm_key_vault_access_policy" "cd_kv_common" {
  key_vault_id = data.azurerm_key_vault.weu_common.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = module.federated_identities.federated_cd_identity.id

  secret_permissions = ["Get", "List"]
}
