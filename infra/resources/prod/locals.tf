locals {
  prefix         = "io"
  env_short      = "p"
  location_short = "itn"
  domain         = "com"
  # the project on which the resources will be created
  # it's the prefix of any resource name
  # it includes the choosen location
  project = "${local.prefix}-${local.env_short}-${local.location_short}"

  # some referenced resources are in a different location
  # for historical reasons
  # this project points to them (westeurope)
  project_legacy = "${local.prefix}-${local.env_short}"

  location              = "italynorth"
  secondary_location    = "germanywestcentral"
  legacy_location       = "westeurope"
  legacy_location_short = "weu"

  environment = {
    prefix    = local.prefix
    env_short = local.env_short
    location  = local.location
    domain    = local.domain
  }

  tags = {
    CostCenter     = "TS000 - Tecnologia e Servizi"
    CreatedBy      = "Terraform"
    Environment    = "Prod"
    BusinessUnit   = "App IO"
    ManagementTeam = "IO Comunicazione"
    Source         = "https://github.com/pagopa/io-messages/blob/main/infra/resources/prod"
  }
}
