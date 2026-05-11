terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }

    azuread = {
      source  = "hashicorp/azuread"
      version = "~> 3.0"
    }

    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }

  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "iopitntfst001"
    container_name       = "terraform-state"
    key                  = "io-messages.bootstrapper.prod.tfstate"
    use_azuread_auth     = true
  }
}

provider "azurerm" {
  features {
  }
  storage_use_azuread = true
}

provider "github" {
  owner = "pagopa"
}

data "azurerm_subscription" "current" {}

data "azurerm_client_config" "current" {}

data "azurerm_container_app_environment" "runner" {
  name                = local.runner.cae_name
  resource_group_name = local.runner.cae_resource_group_name
}

data "azurerm_api_management" "apim" {
  name                = local.apim.name
  resource_group_name = local.apim.resource_group_name
}

data "azurerm_key_vault" "common" {
  name                = local.key_vault.name
  resource_group_name = local.key_vault.resource_group_name
}

data "azurerm_virtual_network" "common" {
  name                = local.vnet.name
  resource_group_name = data.azurerm_resource_group.common_itn_01.name
}

data "azurerm_resource_group" "common_itn_01" {
  name = local.common.itn_resource_group_name
}

data "azurerm_resource_group" "common_weu" {
  name = local.common.weu_resource_group_name
}

data "azurerm_resource_group" "com_itn_01" {
  name = "io-p-itn-com-rg-01"
}

data "azurerm_resource_group" "common" {
  name = "io-p-rg-common"
}

data "azurerm_resource_group" "services_1" {
  name = "io-p-services-rg-1"
}

data "azurerm_resource_group" "services_2" {
  name = "io-p-services-rg-2"
}

data "azurerm_resource_group" "elt" {
  name = "io-p-elt-rg"
}

data "azurerm_resource_group" "internal" {
  name = "io-p-rg-internal"
}

data "azurerm_resource_group" "notifications" {
  name = "io-p-rg-notifications"
}

data "azurerm_resource_group" "linux" {
  name = "io-p-rg-linux"
}

data "azurerm_resource_group" "dashboards" {
  name = "dashboards"
}

data "azuread_group" "admins" {
  display_name = local.adgroups.admins_name
}

data "azuread_group" "developers" {
  display_name = local.adgroups.devs_name
}

module "repo" {
  source  = "pagopa-dx/azure-github-environment-bootstrap/azurerm"
  version = "~> 4.0"

  environment = {
    prefix          = local.prefix
    env_short       = local.env_short
    location        = local.location
    domain          = local.domain
    instance_number = local.instance_number
  }

  additional_resource_group_ids = [
    data.azurerm_resource_group.com_itn_01.id,
    data.azurerm_resource_group.services_1.id,
    data.azurerm_resource_group.services_2.id,
    data.azurerm_resource_group.elt.id,
    data.azurerm_resource_group.linux.id,
    data.azurerm_resource_group.internal.id,
    data.azurerm_resource_group.common.id,
    data.azurerm_resource_group.notifications.id
  ]

  entraid_groups = {
    admins_object_id = data.azuread_group.admins.object_id
    devs_object_id   = data.azuread_group.developers.object_id
  }

  terraform_storage_account = {
    name                = local.tf_storage_account.name
    resource_group_name = local.tf_storage_account.resource_group_name
  }

  repository = {
    owner = "pagopa"
    name  = local.repository.name
  }

  github_private_runner = {
    container_app_environment_id       = data.azurerm_container_app_environment.runner.id
    container_app_environment_location = data.azurerm_container_app_environment.runner.location
    key_vault = {
      name                = local.runner.secret.kv_name
      resource_group_name = local.runner.secret.kv_resource_group_name
    }
  }

  private_dns_zone_resource_group_id = data.azurerm_resource_group.common_weu.id
  opex_resource_group_id             = data.azurerm_resource_group.dashboards.id

  tags = local.tags
}

resource "azurerm_key_vault_access_policy" "infra_cd_kv_common" {
  for_each = toset(local.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = data.azurerm_subscription.current.tenant_id
  object_id    = module.repo.identities.infra.cd.principal_id

  secret_permissions = ["Get", "List", "Set"]
}

resource "azurerm_key_vault_access_policy" "infra_ci_kv_common" {
  for_each = toset(local.keyvault_common_ids)

  key_vault_id = each.key
  tenant_id    = data.azurerm_subscription.current.tenant_id
  object_id    = module.repo.identities.infra.ci.principal_id

  secret_permissions = ["Get", "List"]
}
