locals {
  prefix    = "io"
  env_short = "p"
  repo_name = "io-messages"

  tags = {
    CostCenter  = "TS310 - PAGAMENTI & SERVIZI"
    CreatedBy   = "Terraform"
    Environment = "Prod"
    Owner       = "IO Comunicazione"
    Source      = "https://github.com/pagopa/io-messages/blob/main/infra/github-runner/prod"
  }
}
