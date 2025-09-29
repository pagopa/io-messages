locals {
  prefix          = "io"
  env_short       = "p"
  location        = "italynorth"
  domain          = "msgs"
  instance_number = "01"

  adgroups = {
    admins_name = "io-p-adgroup-com-admins"
    devs_name   = "io-p-adgroup-com-developers"
  }

  runner = {
    cae_name                = "${local.prefix}-${local.env_short}-itn-github-runner-cae-01"
    cae_resource_group_name = "${local.prefix}-${local.env_short}-itn-github-runner-rg-01"
    secret = {
      kv_name                = "${local.prefix}-${local.env_short}-kv-common"
      kv_resource_group_name = "${local.prefix}-${local.env_short}-rg-common"
    }
  }

  apim = {
    name                = "${local.prefix}-${local.env_short}-itn-apim-01"
    resource_group_name = "${local.prefix}-${local.env_short}-itn-common-rg-01"
  }

  vnet = {
    name                = "${local.prefix}-${local.env_short}-itn-common-vnet-01"
    resource_group_name = "${local.prefix}-${local.env_short}-itn-common-rg-01"
  }

  common = {
    weu_resource_group_name = "${local.prefix}-${local.env_short}-rg-common"
    itn_resource_group_name = "${local.prefix}-${local.env_short}-itn-common-rg-01"
  }

  tf_storage_account = {
    name                = "iopitntfst001"
    resource_group_name = "terraform-state-rg"
  }

  repository = {
    name = "io-messages"
  }

  key_vault = {
    name                = "io-p-kv-common"
    resource_group_name = "io-p-rg-common"
  }

  tags = {
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    ManagementTeam = "IO Comunicazione"
    Source         = "https://github.com/pagopa/io-messages/blob/main/infra/repository"
    CostCenter     = "TS000 - Tecnologia e Servizi"
  }
}
