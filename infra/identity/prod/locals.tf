locals {
  prefix    = "io"
  env_short = "p"
  env       = "prod"
  location  = "westeurope"
  project   = "${local.prefix}-${local.env_short}"
  domain    = "messages"

  repo_name = "io-messages"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "Prod"
    Owner       = "IO Comunicazione"
    Source      = "https://github.com/pagopa/io-messages/blob/main/infra/identity/prod"
  }

  environment_cd_roles = {
    subscription = [
      "Contributor"
    ]
    resource_groups = {
      terraform-state-rg = [
        "Storage Blob Data Contributor"
      ],
      io-p-itn-msgs-rg-01 = [
        "Role Based Access Control Administrator"
      ],
      io-p-weu-com-rg-01 = [
        "Role Based Access Control Administrator"
      ],
      io-p-itn-com-rg-01 = [
        "Role Based Access Control Administrator"
      ],
      io-p-rg-operations = [
        "Role Based Access Control Administrator"
      ],
      io-p-rg-internal = [
        "Role Based Access Control Administrator"
      ],
      io-p-itn-common-rg-01 = [
        "Role Based Access Control Administrator"
      ],
      io-p-rg-common = [
        "Role Based Access Control Administrator"
      ]
    }
  }
}
